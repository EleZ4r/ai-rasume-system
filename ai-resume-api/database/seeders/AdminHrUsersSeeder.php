<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminHrUsersSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail = env('ADMIN_SEED_EMAIL');
        $adminPassword = env('ADMIN_SEED_PASSWORD');
        $hrEmail = env('HR_SEED_EMAIL');
        $hrPassword = env('HR_SEED_PASSWORD');

        if (! is_string($adminEmail) || trim($adminEmail) === ''
            || ! is_string($adminPassword) || $adminPassword === ''
            || ! is_string($hrEmail) || trim($hrEmail) === ''
            || ! is_string($hrPassword) || $hrPassword === '') {
            throw new \RuntimeException(
                'Set ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, HR_SEED_EMAIL, and HR_SEED_PASSWORD before seeding staff accounts.'
            );
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['label' => 'Administrator']);
        $hrRole = Role::firstOrCreate(['name' => 'hr'], ['label' => 'Human Resources']);

        $admin = User::firstOrCreate(
            ['email' => $adminEmail],
            ['name' => 'System Administrator', 'password' => $adminPassword, 'is_admin' => true],
        );
        $admin->forceFill(['is_admin' => true])->save();
        $admin->roles()->syncWithoutDetaching([$adminRole->id]);

        $hr = User::firstOrCreate(
            ['email' => $hrEmail],
            ['name' => 'HR Reviewer', 'password' => $hrPassword, 'is_admin' => false],
        );
        $hr->forceFill(['is_admin' => false])->save();
        $hr->roles()->syncWithoutDetaching([$hrRole->id]);
    }
}