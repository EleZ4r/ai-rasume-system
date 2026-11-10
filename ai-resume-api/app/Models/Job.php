<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    use HasFactory;

    protected $table = 'job_listings';

    protected $fillable = ['title', 'company', 'location', 'employment_type', 'description', 'required_skills'];

    protected function casts(): array
    {
        return ['required_skills' => 'array'];
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }
}