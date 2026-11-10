<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->json('applicant_answers')->nullable()->after('verification_questions');
            $table->unsignedTinyInteger('verification_score')->nullable()->after('applicant_answers');
            $table->text('verification_feedback')->nullable()->after('verification_score');
            $table->string('verification_status')->default('not_started')->after('verification_feedback');
        });
    }

    public function down(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->dropColumn([
                'applicant_answers',
                'verification_score',
                'verification_feedback',
                'verification_status',
            ]);
        });
    }
};
