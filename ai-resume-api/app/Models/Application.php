<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $fillable = ['user_id', 'resume_id', 'job_id', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }

    public function mockInterviews()
    {
        return $this->hasMany(MockInterview::class);
    }

}