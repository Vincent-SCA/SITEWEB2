<?php
// send_email.php — reçoit les formulaires Démo et Contact (js/form.js) et les
// envoie à info@solutions-ca.com. Répond "success" ou un message d'erreur en
// texte brut, affiché tel quel sous le formulaire.
//
// La clé secrète reCAPTCHA vit dans config.php, exclu de Git (le dépôt est
// public). Modèle : config.example.php.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: text/plain; charset=utf-8');

function fail(string $message, int $code = 200): void {
    http_response_code($code);
    echo $message;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Méthode de requête invalide.', 405);
}

$config = __DIR__ . '/config.php';
if (!is_file($config)) {
    fail('Configuration du serveur manquante.', 500);
}
$config = require $config;

// Anti-robot : champ piège que seuls les robots remplissent (réponse muette).
if (!empty($_POST['website'])) {
    echo 'success';
    exit;
}

// Anti-robot : soumission en moins de 3 secondes après le chargement.
// form_time vient de l'horloge du visiteur (js/form.js) : une différence négative
// signifie une horloge en avance, pas une soumission trop rapide.
$elapsed = isset($_POST['form_time']) ? time() - (int)$_POST['form_time'] : 0;
if (!isset($_POST['form_time']) || ($elapsed >= 0 && $elapsed < 3)) {
    fail('Soumission trop rapide, veuillez réessayer.');
}

// Anti-robot : reCAPTCHA v3.
$verify = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'secret'   => $config['recaptcha_secret'],
            'response' => $_POST['g-recaptcha-response'] ?? '',
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]),
        'timeout' => 10,
    ],
]));
$captcha = $verify ? json_decode($verify) : null;
if (!$captcha || empty($captcha->success) || ($captcha->score ?? 0) < 0.5) {
    fail('La vérification anti-robot a échoué.');
}

if (empty($_SERVER['HTTP_USER_AGENT']) || preg_match('/bot|crawl|spider/i', $_SERVER['HTTP_USER_AGENT'])) {
    fail('Navigateur non reconnu.');
}

// Limite : une soumission par minute par adresse IP. On lit la DERNIÈRE
// soumission de l'IP (V2 lisait la première, donc la limite ne jouait qu'une fois).
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$now = time();
$logFile = __DIR__ . '/form_submissions.log';
$log = is_file($logFile) ? file_get_contents($logFile) : '';
if (preg_match_all('/^' . preg_quote($ip, '/') . '\t(\d+)$/m', $log, $m) && $now - (int)end($m[1]) < 60) {
    fail('Veuillez patienter une minute avant de soumettre à nouveau.');
}
file_put_contents($logFile, "$ip\t$now\n", FILE_APPEND | LOCK_EX);

// Champs. Le courriel part en texte brut : pas d'échappement HTML, mais on
// retire les retours de ligne des champs d'une ligne.
function field(string $name): string {
    return trim(str_replace(["\r", "\n"], ' ', (string)($_POST[$name] ?? '')));
}

$formType   = field('form_type') === 'demo' ? 'demo' : 'contact';
$firstName  = field('firstName');
$lastName   = field('lastName');
$phone      = field('phoneNumber');
$email      = filter_var(field('email'), FILTER_VALIDATE_EMAIL);
$dealerName = field('dealerName');
$jobTitle   = field('jobTitle');
$numUsers   = field('numUsers');
$comments   = trim((string)($_POST['comments'] ?? ''));

$required = [$firstName, $lastName, $phone, field('email'), $comments];
if ($formType === 'demo') $required[] = $dealerName;
if (in_array('', $required, true)) {
    fail('Veuillez remplir tous les champs obligatoires.');
}
if (!$email) {
    fail('Adresse courriel invalide.');
}

$blacklist = ['http', 'bitcoin', 'Western Union', 'Telegram', 'whatsapp', 'money', 'urgent', 'sex', 'porn'];
foreach ($blacklist as $word) {
    if (stripos($comments, $word) !== false) {
        fail('Message refusé (contenu suspect). Écrivez-nous directement à info@solutions-ca.com.');
    }
}

$subject = $formType === 'demo'
    ? "Demande de démo : $dealerName"
    : 'Nouveau message via solutions-ca.com';

$body  = ($formType === 'demo' ? "Nouvelle demande de démo\n\n" : "Nouveau message du formulaire de contact\n\n");
$body .= "Nom : $firstName $lastName\n";
$body .= "Téléphone : $phone\n";
$body .= "Courriel : $email\n";
if ($dealerName) $body .= "Concessionnaire : $dealerName\n";
if ($jobTitle)   $body .= "Poste occupé : $jobTitle\n";
if ($numUsers)   $body .= "Postes utilisateurs : $numUsers\n";
$body .= "\nCommentaires ou questions :\n$comments\n";

require __DIR__ . '/vendor/autoload.php'; // PHPMailer, installé sur l'hébergeur (composer)
$mail = new PHPMailer(true);
try {
    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = 'localhost';
    $mail->Port = 25;
    $mail->SMTPAuth = false;

    $mail->setFrom('info@solutions-ca.com', 'Solutions CA');
    $mail->addReplyTo($email, "$firstName $lastName");
    $mail->addAddress('info@solutions-ca.com', 'Solutions CA');

    $mail->Subject = $subject;
    $mail->Body    = $body;

    $mail->send();
    echo 'success';
} catch (Exception $e) {
    error_log('send_email: ' . $mail->ErrorInfo);
    fail('Le serveur de courriel n’a pas répondu.', 500);
}
