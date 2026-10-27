<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve existing files (CSS, JS, images, fonts, etc.) directly
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

// Root → index.html
if ($uri === '/') {
    include __DIR__ . '/index.html';
    exit;
}

// Try clean URL → .html
if (file_exists(__DIR__ . rtrim($uri, '/') . '.html')) {
    include __DIR__ . rtrim($uri, '/') . '.html';
    exit;
}

// Try clean URL → .php
if (file_exists(__DIR__ . rtrim($uri, '/') . '.php')) {
    include __DIR__ . rtrim($uri, '/') . '.php';
    exit;
}

// Page 404 du site (en production : ErrorDocument dans .htaccess)
http_response_code(404);
include __DIR__ . '/404.html';
