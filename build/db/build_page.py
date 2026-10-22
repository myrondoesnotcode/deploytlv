"""Build db/index.html from the approved mockup, plus db/config.js and db/auth.js.

    python3 build/db/build_page.py

Reads  ~/Claude Projects/Newsletter/site-mockup/db/index.html  (the approved design)
       build/db/auth.js                                         (real Supabase sign-in)
       .env.local                                               (SUPABASE_URL, SUPABASE_ANON_KEY)
Writes db/index.html, db/auth.js, db/config.js

config.js only ever contains the *public* anon key. Row level security protects the data.
The service-role key is never written into db/.
"""
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
MOCK = pathlib.Path.home() / "Claude Projects/Newsletter/site-mockup/db/index.html"
OUT = ROOT / "db"
SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"


# link previews (WhatsApp, LinkedIn, X): card source is build/db/og-card.html
SHARE_TAGS = """
<meta name="description" content="Every answer, tool, project and win from the DeployTLV Founders/Builders group, searchable. Free for Deploy Log subscribers.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://deploytlv.com/db/">
<meta property="og:site_name" content="Deploy TLV">
<meta property="og:title" content="Deploy DB: everything TLV builders figured out">
<meta property="og:description" content="Every answer, tool, project and win from the DeployTLV Founders/Builders group, searchable. Free with the Deploy Log.">
<meta property="og:image" content="https://deploytlv.com/db/og.png">
<meta property="og:image:alt" content="Deploy DB: everything TLV builders figured out">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Deploy DB: everything TLV builders figured out">
<meta name="twitter:description" content="Every answer, tool, project and win from the DeployTLV Founders/Builders group. Free with the Deploy Log.">
<meta name="twitter:image" content="https://deploytlv.com/db/og.png">"""

def env():
    vals = {}
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"')
    return vals


def must_replace(s, old, new, count=1):
    if old not in s:
        raise SystemExit(f"build_page: expected text not found: {old[:70]!r}")
    return s.replace(old, new, count)


def main():
    s = MOCK.read_text()
    # site fonts already live at /assets/fonts on deploytlv.com
    s = s.replace("url('fonts/", "url('/assets/fonts/")
    # drop the mockup-only controls and bundled data
    s = re.sub(r'<div class="mock" id="mock".*?</div>\s*</div>\s*(?=<div id="toastHost">)', "", s, flags=re.S)
    if 'id="mock"' in s:
        s = re.sub(r'<div class="mock" id="mock".*?<small[^>]*>.*?</small>\s*</div>\s*', "", s, flags=re.S)
    s = must_replace(s, '<script src="data.js"></script>\n', "")
    # replace the simulated-auth script (last inline script) with the real one
    last = s.rindex("<script>")
    end = s.index("</script>", last) + len("</script>")
    s = s[:last] + f'<script src="{SUPABASE_JS}"></script>\n<script src="config.js"></script>\n<script src="auth.js"></script>' + s[end:]
    # account menu: real items only
    s = must_replace(s, '<span class="badge">MEMBER · SINCE MAY 2026</span>', '<span class="badge" id="menuSince">MEMBER</span>')
    s = re.sub(r'\s*<button type="button" role="menuitem" data-act="saved">.*?</button>', "", s)
    s = re.sub(r'\s*<button type="button" role="menuitem" data-act="digest">.*?</button>', "", s)
    s = must_replace(s, 'Privacy &amp; visibility <small>▸</small>', 'Show my name to members <small id="privacyState">Visible</small>')
    s = must_replace(s, '<div class="or">OR WITH EMAIL</div>', '<div class="or" id="orEmail">OR WITH EMAIL</div>')
    # DB script: read-only for everyone, accept signed photo URLs from Supabase storage
    s = must_replace(s, "  S.canEdit=true;\n", "")
    s = must_replace(s, 'function safeImg(r){return r.image&&/^img\\/[a-z0-9-]+\\.jpg$/.test(r.image)?r.image:null;}',
                     'function safeImg(r){return r.image&&/^https:\\/\\/[a-z0-9-]+\\.supabase\\.co\\/storage\\/v1\\/object\\/sign\\//.test(r.image)?r.image:null;}')
    s = must_replace(s, '<title>Deploy DB · Members</title>', '<title>Deploy DB · Members</title>\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">' + SHARE_TAGS)
    # --- subscribe-to-access funnel ---
    cards = (ROOT / "build/db/subscribe-cards.html").read_text()
    step = (ROOT / "build/db/subscribe-step.html").read_text()
    # cards = get access + sign in (returning) + check email (link or code)
    s = re.sub(r'      <!-- sign in -->.*?(?=      <!-- not a member -->)', lambda m: cards, s, flags=re.S)
    s = re.sub(r'      <!-- not a member -->.*?(?=      <!-- oauth progress -->)', lambda m: step, s, flags=re.S)
    s = must_replace(s, '<span class="kick">Members only · Deploy DB</span>', '<span class="kick">Free for Deploy Log subscribers · Deploy DB</span>')
    s = must_replace(s, '<div class="teaser" id="teaser">', '''<div class="whatyou" id="what"><span class="tl">▸ WHAT SUBSCRIBERS GET</span><ul><li><b>Every answer</b> the group has worked out, organized into playbooks by topic.</li><li><b>The stack:</b> the tools, repos and programs members actually use, with links.</li><li><b>Who knows what:</b> find the right builder to ask about anything.</li><li><b>The Deploy Log</b> in your inbox every week, so you never miss the good stuff.</li></ul></div>
      <div class="teaser" id="teaser">''')
    s = must_replace(s, '<button type="button" class="sbtn sm" id="navSignIn">SIGN IN</button>', '<button type="button" class="navlogin" id="navLogin">SIGN IN</button>\n    <button type="button" class="sbtn sm orange" id="navSignIn">GET ACCESS</button>')
    # site nav: logo goes home, links match the main site
    s = must_replace(s, '<a class="slogo" href="#" id="logo">DEPLOY <b>TLV</b></a>', '<a class="slogo" href="/" id="logo">DEPLOY <b>TLV</b></a>')
    s = must_replace(s, '<nav class="slinks" aria-label="Site"><a href="#">Events</a><a href="#">Academy</a><a href="#" aria-current="page">Deploy DB</a></nav>',
                     '<nav class="slinks" aria-label="Site"><a href="/#stories">Stories</a><a href="/#guide">What\'s on</a><a href="/academy/">Academy</a><a href="/db/" aria-current="page">Deploy DB</a><a href="/partner/">Work with us</a></nav>')
    s = must_replace(s, '<div class="trust"><span>NO PASSWORDS</span><span>MEMBERS-ONLY DATA</span><span>HIDE YOUR PROFILE ANYTIME</span></div>', '<div class="trust"><span>FREE WITH THE NEWSLETTER</span><span>NO PASSWORDS</span><span>UNSUBSCRIBE ANYTIME</span></div>')
    s = must_replace(s, '<button type="button" role="menuitem" data-act="signout">Sign out</button>', '<button type="button" role="menuitem" data-act="unsub"><span id="unsubLabel">Unsubscribe</span> <small>✕</small></button>\n        <button type="button" role="menuitem" data-act="signout">Sign out</button>')
    s = must_replace(s, '.tcard{position:relative', '.whatyou{max-width:640px;background:var(--white);border:1.5px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:14px 16px;display:grid;gap:8px}.whatyou .tl{font:700 10px var(--px);color:var(--orange-deep)}.whatyou ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}.whatyou li{font-size:14px;padding-left:20px;position:relative;line-height:1.45}.whatyou li::before{content:"";position:absolute;left:0;top:.45em;width:9px;height:9px;background:var(--orange);border:1.5px solid var(--ink)}\n.navlogin{background:none;border:0;padding:0 6px;white-space:nowrap;min-height:38px;font:700 10px var(--px);color:var(--ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer}#navSignIn{white-space:nowrap}.switch{margin:0;font-size:14px;text-align:center;border-top:1.5px dashed var(--line,#d9d5cc);padding-top:12px}.lnk{background:none;border:0;padding:0;color:var(--orange-deep);font:inherit;font-weight:700;cursor:pointer;text-decoration:underline}\n.tcard{position:relative')
    for gone in ('id="vNo"', 'id="vSent"', 'id="reqForm"'):
        if gone in s:
            raise SystemExit(f"build_page: old access screen still present: {gone}")
    for leftover in ("data.js", 'id="mock"', "DDB_DEMO"):
        if leftover in s:
            raise SystemExit(f"build_page: mockup leftover still present: {leftover}")

    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(s)
    shutil.copyfile(ROOT / "build/db/auth.js", OUT / "auth.js")
    e = env()
    cfg = {
        "url": e.get("SUPABASE_URL", ""),
        "anonKey": e.get("SUPABASE_ANON_KEY", ""),
        "google": False,     # flip to true once Google sign-in is set up in Supabase
        "linkedin": False,   # flip to true once LinkedIn (OIDC) is set up in Supabase
    }
    if cfg["anonKey"] and (cfg["anonKey"] == e.get("SUPABASE_SERVICE_ROLE_KEY") or "service_role" in cfg["anonKey"]):
        raise SystemExit("build_page: refusing to write a service-role key into config.js")
    (OUT / "config.js").write_text("/* Public Supabase config for the Deploy DB. The anon key is meant to be public; RLS protects the data. */\n"
                                    f"window.DDB_CONFIG={json.dumps(cfg, indent=1)};\n")
    print("wrote db/index.html, db/auth.js, db/config.js", "(config is empty until .env.local is filled)" if not cfg["url"] else "")


if __name__ == "__main__":
    main()
