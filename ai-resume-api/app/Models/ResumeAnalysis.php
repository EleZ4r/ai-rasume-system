<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Resume;

class ResumeAnalysis extends Model
{
    use HasFactory;

    protected $fillable = ['resume_id', 'score', 'strengths', 'weaknesses', 'suggestions', 'reviewer_basis', 'verification_questions', 'applicant_answers', 'verification_score', 'verification_feedback', 'verification_weak_topics', 'personalized_reviewer', 'verified_skills', 'verification_status', 'raw_response'];

    protected function casts(): array
    {
        return [
            'strengths' => 'array',
            'weaknesses' => 'array',
            'suggestions' => 'array',
            'verification_questions' => 'array',
            'applicant_answers' => 'array',
            'verification_weak_topics' => 'array',
            'personalized_reviewer' => 'array',
            'verified_skills' => 'array',
            'raw_response' => 'array',
        ];
    }

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }
}
