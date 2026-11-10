@extends('admin.layout')

@section('title', 'Applicants')

@section('content')
<div class="page-heading">
    <div>
        <div class="eyebrow">People</div>
        <h1>Applicants</h1>
        <p>Applicant accounts, resumes, and activity in one place.</p>
    </div>
</div>

<section class="card">
    <div class="section-title">
        <span>Applicant directory</span>
        <span class="muted">{{ number_format($applicants->total()) }} applicants</span>
    </div>
    <form class="filter-form" method="GET" action="{{ route('admin.applicants') }}">
        <label class="filter-search">
            <span class="sr-only">Search applicants</span>
            <input type="search" name="q" value="{{ $search }}" placeholder="Search by name or email" aria-label="Search by name or email">
        </label>
        <select name="resume" aria-label="Filter by resume">
            <option value="">All resume statuses</option>
            <option value="uploaded" @selected($resumeFilter === 'uploaded')>Resume uploaded</option>
            <option value="missing" @selected($resumeFilter === 'missing')>No resume yet</option>
        </select>
        <button class="button" type="submit">Search</button>
        @if($search !== '' || $resumeFilter !== '')
            <a class="button secondary" href="{{ route('admin.applicants') }}">Clear</a>
        @endif
    </form>
    <p class="table-scroll-hint">Swipe horizontally to see all columns.</p>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Applicant</th><th>Resume</th><th>Applications</th><th>Joined</th><th></th></tr></thead>
            <tbody>
            @forelse($applicants as $applicant)
                <tr>
                    <td><a class="applicant-person" href="{{ route('admin.applicants.show', $applicant) }}">
                        <span class="applicant-avatar">{{ strtoupper(substr($applicant->name, 0, 1)) }}</span>
                        <span class="applicant-person-copy"><span class="applicant-person-name">{{ $applicant->name }}</span><span class="applicant-email">{{ $applicant->email }}</span></span>
                    </a></td>
                    <td>
                        @if($applicant->latestResume)
                            <span class="status completed">Uploaded</span>
                            <div class="secondary-cell">{{ $applicant->resumes_count }} {{ \Illuminate\Support\Str::plural('file', $applicant->resumes_count) }}</div>
                        @else
                            <span class="status">Not uploaded</span>
                        @endif
                    </td>
                    <td>{{ number_format($applicant->applications_count) }}</td>
                    <td>{{ $applicant->created_at->format('M j, Y') }}</td>
                    <td><a class="subtle-link" href="{{ route('admin.applicants.show', $applicant) }}">View profile →</a></td>
                </tr>
            @empty
                <tr><td colspan="5" class="muted">{{ $search !== '' || $resumeFilter !== '' ? 'No applicants match those filters.' : 'No applicant accounts have registered yet.' }}</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    <div class="pagination">{{ $applicants->links() }}</div>
</section>
@endsection
