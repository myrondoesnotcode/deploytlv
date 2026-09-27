/* ==========================================================================
   Deploy Academy — the only runtime script on the Academy pages.
   Everything here is progressive enhancement: with JS off the pages still
   read, the courses are still listed and the form still has a working submit
   target (the mailto below is also the <form action> set at parse time).
   Config comes from academy.config.js, which the build generates.
   ========================================================================== */
(function () {
  'use strict'
  var CFG = window.ACADEMY_CONFIG || {}
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* --- reveal on scroll (decorative) ------------------------------------ */
  var rvs = [].slice.call(document.querySelectorAll('.rv'))
  function show (el) { el.classList.add('in') }
  if (!('IntersectionObserver' in window) || reduce) {
    rvs.forEach(show)
  } else {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); obs.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -6% 0px' })
    rvs.forEach(function (el) { obs.observe(el) })
    /* A sweep catches anything the observer misses on a short page. */
    var sweeping = false
    function sweep () {
      rvs.forEach(function (el) {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight * 0.95) show(el)
      })
    }
    addEventListener('scroll', function () {
      if (sweeping) return
      sweeping = true
      requestAnimationFrame(function () { sweeping = false; sweep() })
    }, { passive: true })
    addEventListener('load', sweep); sweep()
  }

  /* --- heavy video loads on approach, never before ---------------------- */
  if ('IntersectionObserver' in window) {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return
        var el = e.target
        if (!el.src && el.dataset.src) { el.src = el.dataset.src; el.load() }
        if (!reduce) { var p = el.play(); if (p && p.catch) p.catch(function () {}) }
        vo.unobserve(el)
      })
    }, { rootMargin: '320px 0px' })
    document.querySelectorAll('video.lazy-video').forEach(function (el) { vo.observe(el) })
  }

  /* --- the hero clip ----------------------------------------------------
     Plays on sight because it is the pitch; muted, because browsers insist.
     Unmuting is a button, and it re-mutes itself once it scrolls away —
     nobody wants audio following them down the page.                      */
  var heroV = document.getElementById('uziv')
  var sndBtn = document.getElementById('sndBtn')
  if (heroV && sndBtn) {
    if (!reduce) { var hp = heroV.play(); if (hp && hp.catch) hp.catch(function () {}) }
    sndBtn.addEventListener('click', function () {
      heroV.muted = !heroV.muted
      sndBtn.innerHTML = heroV.muted ? '\uD83D\uDD0A Sound on' : '\uD83D\uDD07 Mute'
      if (heroV.paused) { var p2 = heroV.play(); if (p2 && p2.catch) p2.catch(function () {}) }
    })
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting && !heroV.muted) {
            heroV.muted = true
            sndBtn.innerHTML = '\uD83D\uDD0A Sound on'
          }
        })
      }, { threshold: 0.2 }).observe(heroV)
    }
  }

  /* --- registration form ------------------------------------------------
     No third-party embed. Submit strategies, configured in
     build/academy/academy.data.mjs:
       'supabase' — insert a row into academy_requests (insert-only RLS)
       'endpoint' — POST JSON to a URL you own
       'mailto'   — open the visitor's own mail client, prefilled
     A failed save falls back to a prefilled mailto link, so a request is
     never simply lost.
     Either way the wording is "request", never "confirmed": nothing here
     takes a payment, so nothing here may claim a seat is held.            */
  var form = document.getElementById('regform')
  if (form) {
    var enroll = CFG.enrollment || { strategy: 'mailto' }
    var statusEl = document.getElementById('reg-status')
    var courseSel = document.getElementById('reg-course')

    /* Preselect the class from ?course= or the card that was clicked. */
    if (courseSel) {
      var want = new URLSearchParams(location.search).get('course') || form.dataset.course
      if (want) {
        (CFG.courses || []).forEach(function (c) {
          if (c.id === want || c.label === want) courseSel.value = c.label
        })
      }
    }

    /* The line above the fields describes whichever class is selected:
       date, time, price and room, or "coming soon" for a waitlist class. */
    var details = document.getElementById('reg-details')
    function showDetails () {
      if (!details || !courseSel) return
      var c = (CFG.courses || []).filter(function (x) { return x.label === courseSel.value })[0]
      if (!c) return
      var where = CFG.venue ? CFG.venue.street + ', Tel Aviv' : 'Tel Aviv'
      details.textContent = c.dateLabel
        ? [c.dateLabel + (c.timeLabel ? ', ' + c.timeLabel : ''),
           c.price ? (CFG.currencySymbol || '₪') + c.price : '', where].filter(Boolean).join(' · ')
        : 'Date coming soon. Leave your details and we will tell you first.'
    }
    if (courseSel) courseSel.addEventListener('change', showDetails)
    showDetails()

    function mailtoFor (data) {
      var body = [
        'Class: ' + data.course,
        'Name: ' + data.name,
        'Email: ' + data.email,
        '', 'What I would like to build:', data.idea || '(not sure yet)',
        '', '— sent from deploytlv.com' + location.pathname
      ].join('\n')
      return 'mailto:' + (CFG.contactEmail || 'hello@deploytlv.com') +
        '?subject=' + encodeURIComponent('Academy seat request — ' + data.course) +
        '&body=' + encodeURIComponent(body)
    }

    function waFor (data) {
      return 'https://wa.me/' + CFG.whatsappNumber + '?text=' + encodeURIComponent([
        'Hi! I just requested a seat at Deploy Academy.', '',
        'Class: ' + data.course, 'Name: ' + data.name, 'Email: ' + data.email,
        'What I want to build: ' + (data.idea || 'not sure yet')
      ].join('\n'))
    }

    function say (msg, ok) {
      statusEl.hidden = false
      statusEl.innerHTML = msg
      statusEl.style.background = ok === false ? 'var(--paper2)' : 'var(--orange)'
    }

    /* The form's action="mailto:…" in the HTML is the no-JS fallback; the
       build keeps it in step with contactEmail. With JS we take over below. */
    form.addEventListener('submit', function (ev) {
      ev.preventDefault()
      var data = {
        course: courseSel ? courseSel.value : (CFG.defaultCourse || 'Deploy Academy'),
        name: (form.elements.name.value || '').trim(),
        email: (form.elements.email.value || '').trim(),
        idea: form.elements.idea ? (form.elements.idea.value || '').trim() : ''
      }
      if (!data.name) { form.elements.name.focus(); say('Add your name so we know who to write back to.', false); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { form.elements.email.focus(); say('That email does not look right — check it and send again.', false); return }

      /* Honeypot: people never see this field, bots fill it in. Pretend it
         worked and store nothing. */
      if (form.elements.website && form.elements.website.value) {
        form.reset(); say('Request received. We will come back to you by email.'); return
      }

      /* WhatsApp first: open the chat with the request typed out, inside
         the click itself so browsers don't block it and phones hand it to
         the app. The save below still runs; keepalive lets it finish even if
         this tab navigates away. This tab moves on to the confirmation page. */
      var waWin = null
      if (CFG.whatsappNumber) {
        try { sessionStorage.setItem('academy_request', JSON.stringify(data)) } catch (e) {}
        waWin = window.open(waFor(data), '_blank')
      }

      var sb = enroll.supabase || {}
      var req = null
      if (enroll.strategy === 'supabase' && sb.url && sb.anonKey) {
        req = fetch(sb.url.replace(/\/$/, '') + '/rest/v1/' + (sb.table || 'academy_requests'), {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'apikey': sb.anonKey,
            'Authorization': 'Bearer ' + sb.anonKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            course: data.course.slice(0, 120), name: data.name.slice(0, 120),
            email: data.email.slice(0, 254), idea: data.idea ? data.idea.slice(0, 2000) : null,
            page: location.pathname.slice(0, 200)
          })
        })
      } else if (enroll.strategy === 'endpoint' && enroll.endpoint) {
        req = fetch(enroll.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      }

      if (req) {
        var btn = form.querySelector('button[type=submit]')
        btn.setAttribute('aria-disabled', 'true')
        say('Sending&hellip;')
        req.then(function (r) {
          if (!r.ok) throw new Error(r.status)
          /* Hand the answers to the confirmation page for its WhatsApp
             button. sessionStorage stays in this tab — never in the URL. */
          try { sessionStorage.setItem('academy_request', JSON.stringify(data)) } catch (e) {}
          /* Pop-up blocked: take this tab to WhatsApp instead. */
          if (CFG.whatsappNumber && !waWin) { location.href = waFor(data); return }
          if (CFG.urls && CFG.urls.confirmation) {
            /* Tell the confirmation page which class this was for. */
            var picked = (CFG.courses || []).filter(function (c) { return c.label === data.course })[0]
            location.href = CFG.urls.confirmation + (picked ? '?course=' + encodeURIComponent(picked.id) : '')
            return
          }
          form.reset()
          say('Request received. We will come back to you by email about ' + data.course + '.')
        }).catch(function () {
          say('That did not go through on our side. <a href="' + mailtoFor(data).replace(/"/g, '&quot;') + '">Send it by email instead</a> &mdash; it opens already filled in &mdash; or write to ' + CFG.contactEmail + '.', false)
        }).then(function () { btn.removeAttribute('aria-disabled') })
        return
      }

      /* mailto: hand it to the visitor's own mail client. */
      window.location.href = mailtoFor(data)
      say('Your mail app should be opening with the request filled in &mdash; press send and we will take it from there. Nothing has been charged. If nothing opened, write to <a href="mailto:' + CFG.contactEmail + '">' + CFG.contactEmail + '</a>.')
    })
  }

  /* --- send it on WhatsApp --------------------------------------------
     On /academy/confirmed/: a wa.me link that opens a chat with us with the
     visitor's request already typed out, so all they do is press send.
     Hidden unless whatsappNumber is set.                                   */
  var waSlot = document.getElementById('waSlot')
  if (waSlot && CFG.whatsappNumber) {
    var got = null
    try { got = JSON.parse(sessionStorage.getItem('academy_request') || 'null') } catch (e) {}
    var lines = got
      ? ['Hi! I just requested a seat at Deploy Academy.', '',
         'Class: ' + got.course, 'Name: ' + got.name, 'Email: ' + got.email,
         'What I want to build: ' + (got.idea || 'not sure yet')]
      : ['Hi! I just requested a seat at Deploy Academy.']
    var wa = document.createElement('a')
    wa.className = 'bbtn'
    wa.href = 'https://wa.me/' + CFG.whatsappNumber + '?text=' + encodeURIComponent(lines.join('\n'))
    wa.target = '_blank'; wa.rel = 'noopener'
    wa.innerHTML = (got ? 'WhatsApp didn’t open? Tap here' : 'Message us on WhatsApp') + ' &rarr;'
    waSlot.parentNode.insertBefore(wa, waSlot.parentNode.firstChild)
    var waNote = document.createElement('p')
    waNote.className = 'offer'
    waNote.textContent = 'Your request is typed out in the chat. Press send and we take it from there on WhatsApp.'
    waSlot.parentNode.parentNode.insertBefore(waNote, waSlot.parentNode.nextSibling)
    waSlot.remove()
    /* One loud button: the calendar steps down beside it. */
    var ics = document.getElementById('icsBtn')
    if (ics) ics.className = 'btn outline'
  }

  /* --- add to calendar --------------------------------------------------
     Built here rather than linked out, so it works with no date service and
     no tracking. With no cohort date set the button says so instead of
     producing an invitation to a day we made up.                          */
  var icsBtn = document.getElementById('icsBtn')
  if (icsBtn) {
    var note = document.getElementById('icsNote')
    var co = CFG.cohort || {}
    var summary = 'Deploy Academy 101 — build & ship a website with AI'
    var slug = 'deploy-academy-101'
    /* ?course= picks the class that was booked; each carries its own date. */
    var booked = (CFG.courses || []).filter(function (c) {
      return c.id === new URLSearchParams(location.search).get('course')
    })[0]
    if (booked) {
      co = booked
      summary = 'Deploy ' + booked.code.replace('ACADEMY', 'Academy') + ' — ' + booked.title
      slug = 'deploy-' + booked.id
      var cls = document.getElementById('cf-class')
      var when = document.getElementById('cf-when')
      if (cls) {
        cls.querySelector('strong').textContent = booked.code.replace('ACADEMY', 'Academy')
        cls.querySelector('span').textContent = booked.title
      }
      if (when) {
        when.querySelector('strong').textContent = booked.dateLabel || 'Date coming soon'
        when.querySelector('span').textContent = booked.timeLabel || 'We will email you the moment it is set'
      }
    }
    if (!co.date) {
      icsBtn.setAttribute('aria-disabled', 'true')
      icsBtn.textContent = 'Date coming soon'
      if (note) note.textContent = 'The next cohort date is not set yet. We will email it to you, and this button will hand it to your calendar.'
    } else {
      if (note) note.textContent = co.dateLabel + (co.timeLabel ? ' · ' + co.timeLabel : '') + ' · ' + (CFG.venue ? CFG.venue.line : '')
      icsBtn.addEventListener('click', function () {
        var s = (co.startTime || '18:00').replace(':', '') + '00'
        var e = (co.endTime || '20:00').replace(':', '') + '00'
        var d = co.date.replace(/-/g, '')
        var ics = [
          'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Deploy TLV//Academy//EN',
          'BEGIN:VEVENT',
          'UID:' + d + '-' + slug + '@deploytlv.com',
          'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
          'DTSTART;TZID=' + (co.timezone || 'Asia/Jerusalem') + ':' + d + 'T' + s,
          'DTEND;TZID=' + (co.timezone || 'Asia/Jerusalem') + ':' + d + 'T' + e,
          'SUMMARY:' + summary,
          'LOCATION:' + (CFG.venue ? CFG.venue.line : 'Tel Aviv'),
          'DESCRIPTION:Bring a laptop and charger, with Claude Code set up beforehand (it comes with a Claude Pro plan or above).',
          'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n')
        var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
        var a = document.createElement('a')
        a.href = url; a.download = slug + '.ics'
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      })
    }
  }
})()
