@extends('admin.layout')

@section('title', 'Job listings')

@section('content')
<div class="page-heading"><div><div class="eyebrow">Hiring</div><h1>Job listings</h1><p>Publish roles and see how many applicants each listing attracts.</p></div></div>
<div class="grid section-grid">
    <section class="card">
        <h2 class="section-title">All listings <span class="muted">{{ $jobs->total() }} total</span></h2>
        <p class="table-scroll-hint">Swipe horizontally to see all columns.</p>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Position</th><th>Location</th><th>Type</th><th>Applicants</th><th>Posted</th></tr></thead><tbody>
            @forelse($jobs as $job)
                <tr><td class="primary-cell">{{ $job->title }}<div class="secondary-cell">{{ $job->company }}</div></td><td>{{ $job->location }}</td><td>{{ $job->employment_type }}</td><td>{{ $job->applications_count }}</td><td>{{ $job->created_at->format('M j, Y') }}</td></tr>
            @empty
                <tr><td colspan="5" class="muted">No job listings yet. Create your first role using the form.</td></tr>
            @endforelse
        </tbody></table></div>
        <div class="pagination">{{ $jobs->links() }}</div>
    </section>
    <section class="card">
        <h2 class="section-title">Create a listing</h2>
        <form method="POST" action="{{ route('admin.jobs.store') }}" class="panel-stack">@csrf
            <div class="field"><label for="title">Job title</label><input id="title" name="title" value="{{ old('title') }}" required maxlength="255" placeholder="e.g. Product Designer"></div>
            <div class="field"><label for="company">Company</label><input id="company" name="company" value="{{ old('company') }}" required maxlength="255" placeholder="Company name"></div>
            <div class="form-grid">
                <div class="field"><label for="location">Location</label><input id="location" name="location" value="{{ old('location', 'Remote') }}" required maxlength="255"></div>
                <div class="field"><label for="employment_type">Employment type</label><select id="employment_type" name="employment_type" required>@foreach(['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'] as $type)<option value="{{ $type }}" @selected(old('employment_type', 'Full-time') === $type)>{{ $type }}</option>@endforeach</select></div>
            </div>
            <div class="field"><label for="required_skills">Required skills</label><input id="required_skills" name="required_skills" value="{{ old('required_skills') }}" required placeholder="Laravel, PHP, SQL"><span class="muted">Separate skills with commas.</span></div>
            <div class="field"><label for="description">Description</label><textarea id="description" name="description" required maxlength="10000" placeholder="Describe the role and responsibilities">{{ old('description') }}</textarea></div>
            <button class="button" type="submit">Publish job listing</button>
        </form>
    </section>
</div>
@endsection
