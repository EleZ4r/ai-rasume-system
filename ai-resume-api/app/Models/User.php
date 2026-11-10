<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'is_admin'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    protected $appends = ['is_hr'];

    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function resumes()
    {
        return $this->hasMany(Resume::class);
    }

    public function latestResume()
    {
        return $this->hasOne(Resume::class)->latestOfMany();
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function isAdmin(): bool
    {
        if ($this->is_admin) {
            return true;
        }

        return $this->roles()->where('name', 'admin')->exists();
    }

    public function getIsHrAttribute(): bool
    {
        return $this->roles()->where('name', 'hr')->exists();
    }
}
