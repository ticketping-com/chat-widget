<?php

use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/api/ticketping-token', function (Request $request) {
    $user = $request->user();

    $claims = array_filter([
        'sub' => (string) $user->id,
        'email' => $user->email,
        'name' => $user->name,
        'exp' => time() + 300,
    ], fn ($value) => $value !== null && $value !== '');

    $token = JWT::encode($claims, config('services.ticketping.identity_secret'), 'HS256');

    return response($token)->header('Content-Type', 'text/plain');
})->middleware('auth');
