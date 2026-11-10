<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ResumeController;
use App\Http\Controllers\Api\JobController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/admin/mock-interviews/{interview}/audio/{questionIndex}', [\App\Http\Controllers\Api\AdminController::class, 'interviewAudio'])
    ->middleware('signed:relative')
    ->name('admin.mock-interviews.audio');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', function (Request $request) {
        return $request->user();
    });

    Route::get('/applications/updates', [\App\Http\Controllers\Api\JobController::class, 'applicantUpdates']);
    Route::get('/resumes', [ResumeController::class, 'index']);
    Route::post('/resume/upload', [ResumeController::class, 'upload']);
    Route::put('/resume/{resume}/replace', [ResumeController::class, 'replace']);
    Route::post('/resume/{resume}/analyze', [ResumeController::class, 'analyze']);
    Route::post('/resume/{resume}/verify', [ResumeController::class, 'verify']);
    Route::post('/resume/{resume}/reviewer', [ResumeController::class, 'reviewer']);
    Route::get('/resume/{resume}', [ResumeController::class, 'show']);
    Route::get('/jobs/recommendations', [JobController::class, 'recommendations']);
    Route::post('/applications', [JobController::class, 'apply']);
    Route::post('/applications/{application}/mock-interview', [JobController::class, 'startInterview']);
    Route::get('/mock-interviews/{interview}', [JobController::class, 'showInterview']);
    Route::post('/mock-interviews/{interview}/transcribe', [JobController::class, 'transcribeAnswer']);
    Route::post('/mock-interviews/{interview}/answers', [JobController::class, 'answer']);
    Route::post('/mock-interviews/{interview}/report', [JobController::class, 'report']);
});

// Admin routes (basic)
Route::middleware(['auth:sanctum','admin'])->prefix('admin')->group(function () {
    Route::get('/jobs', [\App\Http\Controllers\Api\AdminController::class, 'jobs']);
    Route::post('/jobs', [\App\Http\Controllers\Api\AdminController::class, 'storeJob']);
    Route::get('/resumes', [\App\Http\Controllers\Api\AdminController::class, 'resumes']);
    Route::get('/resumes/{resume}', [\App\Http\Controllers\Api\AdminController::class, 'show']);
    Route::get('/mock-interviews', [\App\Http\Controllers\Api\AdminController::class, 'interviews']);
    Route::get('/mock-interviews/{interview}', [\App\Http\Controllers\Api\AdminController::class, 'interview']);
    Route::post('/mock-interviews/{interview}/decision', [\App\Http\Controllers\Api\AdminController::class, 'decideInterview']);
});
