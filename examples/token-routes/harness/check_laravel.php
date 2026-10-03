<?php

// Runs the Laravel route closure without Laravel and prints one JSON line.
// Called by ../check.ts with TICKETPING_IDENTITY_SECRET set (after `composer install` in ../php).

namespace Illuminate\Http {
    class Request
    {
        public function __construct(private ?object $user) {}

        public function user(): ?object
        {
            return $this->user;
        }
    }

    class Response
    {
        public array $headers = [];

        public function __construct(public string $content) {}

        public function header(string $name, string $value): static
        {
            $this->headers[$name] = $value;
            return $this;
        }
    }
}

namespace Illuminate\Support\Facades {
    class Route
    {
        public static ?\Closure $handler = null;

        public static function post(string $uri, \Closure $handler): static
        {
            static::$handler = $handler;
            return new static();
        }

        public function middleware(string $name): static
        {
            return $this;
        }
    }
}

namespace {
    require __DIR__ . '/../php/vendor/autoload.php';

    function env(string $key)
    {
        return getenv($key) ?: null;
    }

    function config(string $key)
    {
        $services = require __DIR__ . '/../php/config/services.php';
        return $services['ticketping']['identity_secret'];
    }

    function response(string $content): Illuminate\Http\Response
    {
        return new Illuminate\Http\Response($content);
    }

    require __DIR__ . '/../php/routes/web.php';

    $user = (object) ['id' => 123, 'email' => 'ada@acme.com', 'name' => 'Ada Lovelace'];
    $response = (Illuminate\Support\Facades\Route::$handler)(new Illuminate\Http\Request($user));
    echo json_encode(['example' => 'php', 'status' => 200, 'token' => $response->content]), "\n";
}
