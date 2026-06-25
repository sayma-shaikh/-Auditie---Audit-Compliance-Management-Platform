(async () => {
  const base = process.env.BASE || 'http://localhost:3001';
  const email = `devtester+${Date.now()}@example.com`;
  const password = 'Password123!';
  try {
    console.log('Registering user', email);
    let res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Dev Tester', role: 'MAKER' }),
    });
    console.log('Register status', res.status);
    const setCookie = res.headers.get('set-cookie');
    const body = await res.json().catch(() => null);
    console.log('Register body:', body);

    const cookie = setCookie ? setCookie.split(';')[0] : null;

    console.log('Fetching repository list');
    res = await fetch(base + '/api/repository', { headers: { Cookie: cookie || '' } });
    console.log('Repo status', res.status);
    const repo = await res.json().catch(() => null);
    console.log('Repository:', Array.isArray(repo) ? `items=${repo.length}` : repo);

    if (Array.isArray(repo) && repo.length > 0) {
      const first = repo[0];
      console.log('Attempting view on first item id=', first.id);
      const viewRes = await fetch(`${base}/api/repository/${first.id}/view`, { headers: { Cookie: cookie || '' } });
      console.log('View status', viewRes.status);
      const viewBody = await viewRes.json().catch(() => null);
      console.log('View body:', viewBody);

      const editRes = await fetch(`${base}/api/repository/${first.id}/edit`, { headers: { Cookie: cookie || '' } });
      console.log('Edit status', editRes.status);
      const editBody = await editRes.json().catch(() => null);
      console.log('Edit body:', editBody);
    } else {
      console.log('No repository items to test view/edit on.');
    }
  } catch (err) {
    console.error('Test script error', err);
    process.exit(1);
  }
})();
