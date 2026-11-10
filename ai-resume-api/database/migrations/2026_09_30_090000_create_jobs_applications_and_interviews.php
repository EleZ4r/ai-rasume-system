<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->json('verified_skills')->nullable();
        });

        Schema::create('job_listings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('company');
            $table->string('location')->default('Remote');
            $table->string('employment_type')->default('Full-time');
            $table->text('description');
            $table->json('required_skills');
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_id')->constrained('job_listings')->cascadeOnDelete();
            $table->string('status')->default('submitted');
            $table->timestamps();
            $table->unique(['user_id', 'resume_id', 'job_id']);
        });

        Schema::create('mock_interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->json('questions');
            $table->json('answers')->nullable();
            $table->json('evaluations')->nullable();
            $table->json('report')->nullable();
            $table->string('status')->default('in_progress');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_interviews');
        Schema::dropIfExists('applications');
        Schema::dropIfExists('job_listings');
        Schema::table('resume_analyses', function (Blueprint $table) {
            $table->dropColumn('verified_skills');
        });
    }
};