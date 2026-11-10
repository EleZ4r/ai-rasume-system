<?php

use App\Http\Controllers\AdminDashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/login', [AdminDashboardController::class, 'login'])->name('admin.login');
Route::post('/admin/login', [AdminDashboardController::class, 'authenticate'])->name('login');

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'dashboard'])->name('dashboard');
    Route::post('/logout', [AdminDashboardController::class, 'logout'])->name('logout');
    Route::get('/reports', [AdminDashboardController::class, 'reports'])->name('reports');
    Route::get('/applicants', [AdminDashboardController::class, 'applicants'])->name('applicants');
    Route::get('/applicants/{applicant}', [AdminDashboardController::class, 'showApplicant'])->name('applicants.show');
    Route::get('/resumes/{resume}/file', [AdminDashboardController::class, 'viewResume'])->name('resumes.file');
    Route::get('/jobs', [AdminDashboardController::class, 'jobs'])->name('jobs');
    Route::post('/jobs', [AdminDashboardController::class, 'storeJob'])->name('jobs.store');
    Route::get('/interviews', [AdminDashboardController::class, 'interviews'])->name('interviews');
    Route::get('/interviews/{interview}', [AdminDashboardController::class, 'showInterview'])->name('interviews.show');
    Route::post('/interviews/{interview}/decision', [AdminDashboardController::class, 'decideInterview'])->name('interviews.decision');
});
