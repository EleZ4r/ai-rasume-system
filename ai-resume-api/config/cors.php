<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:8081',
        'http://localhost:8083',
        'http://localhost:8084',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8083',
        'http://127.0.0.1:8084',
        'http://192.168.100.228:8081',
        'http://192.168.100.228:8083',
        'exp://192.168.100.228:8081',
        'exp://192.168.100.228:8083',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
