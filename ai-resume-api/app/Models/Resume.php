<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\ResumeAnalysis;

class Resume extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'filename', 'path', 'text', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function resumeAnalyses()
    {
        return $this->hasMany(ResumeAnalysis::class);
    }
}
