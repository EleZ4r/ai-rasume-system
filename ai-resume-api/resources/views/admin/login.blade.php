<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin sign in · Galila</title>
    <style>
        *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 20% 12%,#e9edff 0%,transparent 36%),#f5f7fb;padding:20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#202b39}.card{width:min(420px,100%);background:white;border:1px solid #e8ecf2;border-radius:14px;padding:34px;box-shadow:0 20px 60px #1a294514}.brand{display:flex;align-items:center;gap:11px;font-weight:750;font-size:19px;margin-bottom:32px;color:#172536;text-decoration:none}.mark{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#8193f5,#526de5);color:white;box-shadow:0 5px 12px #526de540}.mark svg{width:25px;height:25px;display:block}.card h1{font-size:22px;margin:0 0 7px}.intro{font-size:12px;color:#8190a2;margin:0 0 24px}.form{display:grid;gap:15px}.field{display:grid;gap:6px}.field label{font-size:11px;font-weight:650;color:#536174}.field input{width:100%;border:1px solid #dfe4eb;border-radius:6px;padding:11px;font:inherit;font-size:12px;outline:none}.field input:focus{border-color:#8495ef;box-shadow:0 0 0 3px #8495ef20}.remember{display:flex;align-items:center;gap:7px;color:#69778a;font-size:11px}.button{border:0;border-radius:7px;padding:11px;background:#526de5;color:white;font-weight:650;cursor:pointer}.error{color:#ad4145;background:#fff0ef;border-radius:6px;padding:9px;font-size:11px}.footer{text-align:center;color:#98a3b1;font-size:10px;margin-top:22px}.brand:focus-visible,.button:focus-visible{outline:3px solid #aebaff;outline-offset:3px}@media(max-width:480px){body{padding:14px}.card{padding:27px 23px;border-radius:12px}}
    </style>
</head>
<body>
<section class="card">
    <a class="brand" href="{{ route('admin.login') }}" aria-label="Galila admin sign in">
        <span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 8.5A8.5 8.5 0 1 0 20 13h-7m7 0v5m0-5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span>Galila</span>
    </a>
    <h1>Welcome back</h1>
    <p class="intro">Sign in with your administrator or HR account.</p>
    @if($errors->any())<div class="error" role="alert">{{ $errors->first() }}</div>@endif
    <form class="form" method="POST" action="{{ route('login') }}">
        @csrf
        <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="username" required autofocus></div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
        <label class="remember"><input type="checkbox" name="remember" value="1"> Keep me signed in</label>
        <button class="button" type="submit">Sign in to workspace</button>
    </form>
    <div class="footer">Authorized admin and HR accounts only</div>
</section>
</body>
</html>
