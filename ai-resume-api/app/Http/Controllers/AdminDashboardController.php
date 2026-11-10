<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Job;
use App\Models\MockInterview;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

class AdminDashboardController extends Controller
{
    public function login(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('admin.dashboard');
        }

        return view('admin.login');
    }

    public function authenticate(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'The email or password is incorrect.'])->onlyInput('email');
        }

        $request->session()->regenerate();

        if (! $request->user()->isAdmin() && ! $request->user()->roles()->where('name', 'hr')->exists()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors(['email' => 'This account does not have admin or HR access.'])->onlyInput('email');
        }

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }

    public function dashboard(): View
    {
        $pendingInterviews = MockInterview::where('status', 'completed')->whereNull('review_decision')->count();
        $recentApplications = Application::with(['user', 'job'])
            ->latest()
            ->limit(6)
            ->get();

        return view('admin.dashboard', [
            'stats' => [
                ['label' => 'Total applicants', 'value' => $this->applicantCount(), 'detail' => 'Registered accounts'],
                ['label' => 'Resumes', 'value' => Resume::count(), 'detail' => 'Uploaded by applicants'],
                ['label' => 'Applications', 'value' => Application::count(), 'detail' => 'Across all job listings'],
                ['label' => 'Awaiting review', 'value' => $pendingInterviews, 'detail' => 'Completed mock interviews'],
            ],
            'recentApplications' => $recentApplications,
            'applicationTrend' => $this->monthlyCounts(Application::class, 6),
            'activeJobs' => Job::withCount('applications')->orderByDesc('applications_count')->limit(5)->get(),
        ]);
    }

    public function reports(): View
    {
        $statusCounts = Application::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->orderBy('status')
            ->get();

        return view('admin.reports', [
            'totals' => [
                'applicants' => $this->applicantCount(),
                'resumes' => Resume::count(),
                'applications' => Application::count(),
                'interviews' => MockInterview::count(),
            ],
            'applicationStatuses' => $statusCounts,
            'monthlyUsers' => $this->monthlyCounts(User::class, 12, applicantsOnly: true),
            'monthlyResumes' => $this->monthlyCounts(Resume::class, 12),
            'monthlyApplications' => $this->monthlyCounts(Application::class, 12),
        ]);
    }

    public function applicants(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'resume' => ['nullable', 'in:uploaded,missing'],
        ]);
        $query = $this->applicantsQuery()
            ->withCount(['resumes', 'applications'])
            ->with('latestResume');

        $search = trim($filters['q'] ?? '');

        if ($search !== '') {
            $query->where(function ($applicants) use ($search): void {
                $applicants->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (($filters['resume'] ?? '') === 'uploaded') {
            $query->whereHas('resumes');
        } elseif (($filters['resume'] ?? '') === 'missing') {
            $query->whereDoesntHave('resumes');
        }

        return view('admin.applicants', [
            'applicants' => $query->latest()->paginate(15)->withQueryString(),
            'search' => $search,
            'resumeFilter' => $filters['resume'] ?? '',
        ]);
    }

    public function showApplicant(User $applicant): View
    {
        abort_unless(
            $this->applicantsQuery()->whereKey($applicant->id)->exists(),
            404,
        );

        $applicant->load([
            'resumes' => fn ($query) => $query->with('resumeAnalyses')->latest('created_at'),
            'applications.job',
            'applications.mockInterviews' => fn ($query) => $query->latest('created_at'),
        ]);

        return view('admin.applicant-detail', compact('applicant'));
    }

    public function viewResume(Resume $resume)
    {
        abort_unless(Storage::disk('local')->exists($resume->path), 404);

        return Storage::disk('local')->response($resume->path, $resume->filename, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function jobs(): View
    {
        return view('admin.jobs', [
            'jobs' => Job::withCount('applications')->orderByDesc('created_at')->paginate(10),
        ]);
    }

    public function storeJob(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'company' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'employment_type' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:10000'],
            'required_skills' => ['required', 'string', 'max:3000'],
        ]);

        $data['required_skills'] = array_values(array_unique(array_filter(array_map(
            'trim',
            explode(',', $data['required_skills']),
        ))));

        if ($data['required_skills'] === []) {
            return back()->withErrors(['required_skills' => 'Enter at least one skill.'])->withInput();
        }

        if (count($data['required_skills']) > 30 || collect($data['required_skills'])->contains(fn ($skill) => mb_strlen($skill) > 100)) {
            return back()->withErrors(['required_skills' => 'Enter up to 30 skills, each no longer than 100 characters.'])->withInput();
        }

        Job::create($data);

        return redirect()->route('admin.jobs')->with('success', 'Job listing created.');
    }

    public function interviews(Request $request): View
    {
        $query = MockInterview::with(['application.user', 'application.job'])->latest();

        if ($request->query('status') === 'pending') {
            $query->where('status', 'completed')->whereNull('review_decision');
        }

        return view('admin.interviews', [
            'interviews' => $query->paginate(15)->withQueryString(),
            'pendingCount' => MockInterview::where('status', 'completed')->whereNull('review_decision')->count(),
        ]);
    }

    public function showInterview(MockInterview $interview): View
    {
        $interview->load(['application.user', 'application.job', 'application.resume']);

        return view('admin.interview-detail', compact('interview'));
    }

    public function decideInterview(Request $request, MockInterview $interview): RedirectResponse
    {
        if ($interview->status !== 'completed') {
            return back()->withErrors(['decision' => 'The applicant must complete the mock interview before HR review.']);
        }

        $data = $request->validate([
            'decision' => ['required', 'in:passed,rejected'],
            'note' => ['nullable', 'string', 'max:3000'],
        ]);

        $interview->update([
            'review_decision' => $data['decision'],
            'review_note' => $data['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $interview->application()->update([
            'status' => $data['decision'] === 'passed' ? 'admin_passed' : 'admin_rejected',
        ]);

        return redirect()->route('admin.interviews.show', $interview)->with('success', 'Interview decision saved.');
    }

    /**
     * @return array<int, array{label: string, value: int}>
     */
    private function monthlyCounts(string $model, int $months, bool $applicantsOnly = false): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);
        $query = $model::query()->where('created_at', '>=', $start);

        if ($applicantsOnly) {
            $query->where('is_admin', false)
                ->whereDoesntHave('roles', fn ($roles) => $roles->whereIn('name', ['admin', 'hr']));
        }

        $counts = $query
            ->get(['created_at'])
            ->countBy(fn ($row) => $row->created_at->format('Y-m'));

        return collect(range(0, $months - 1))
            ->map(function (int $offset) use ($start, $counts, $months): array {
                $date = $start->copy()->addMonths($offset);

                return [
                    'label' => $date->format($months > 6 ? 'M y' : 'M'),
                    'value' => (int) ($counts[$date->format('Y-m')] ?? 0),
                ];
            })
            ->all();
    }

    private function applicantCount(): int
    {
        return $this->applicantsQuery()->count();
    }

    private function applicantsQuery()
    {
        return User::query()
            ->where('is_admin', false)
            ->whereDoesntHave('roles', fn ($roles) => $roles->whereIn('name', ['admin', 'hr']));
    }
}
