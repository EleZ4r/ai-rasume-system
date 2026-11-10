<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MockInterview extends Model
{
    protected $fillable = ['application_id', 'questions', 'answers', 'evaluations', 'report', 'status', 'audio_paths', 'review_decision', 'review_note', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return [
            'questions' => 'array',
            'answers' => 'array',
            'evaluations' => 'array',
            'report' => 'array',
            'audio_paths' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}