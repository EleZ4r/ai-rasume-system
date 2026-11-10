<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('user:make-admin {email}', function (string $email) {
    $user = User::where('email', $email)->first();

    if (! $user) {
        $this->error("No user found for {$email}.");
        return self::FAILURE;
    }

    $user->is_admin = true;
    $user->save();
    $this->info("{$user->email} is now an admin.");

    return self::SUCCESS;
})->purpose('Promote an existing user to admin');
