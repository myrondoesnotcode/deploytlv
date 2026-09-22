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
     No third-party embed. Two submit strategies, both configured in
     build/academy/academy.data.mjs:
       'endpoint' — POST JSON to a URL you own
       'mailto'   — open the visitor's own mail client, prefilled
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
        idea: (form.elements.idea.value || '').trim()
      }
      if (!data.name) { form.elements.name.focus(); say('Add your name so we know who to write back to.', false); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { form.elements.email.focus(); say('That email does not look right — check it and send again.', false); return }

      if (enroll.strategy === 'endpoint' && enroll.endpoint) {
        var btn = form.querySelector('button[type=submit]')
        btn.setAttribute('aria-disabled', 'true')
        say('Sending&hellip;')
        fetch(enroll.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error(r.status)
          if (CFG.urls && CFG.urls.confirmation) { location.href = CFG.urls.confirmation; return }
          form.reset()
          say('Request received. We will come back to you by email about ' + data.course + '.')
        }).catch(function () {
          say('That did not go through. Email us directly at <a href="mailto:' + (CFG.contactEmail) + '">' + CFG.contactEmail + '</a> and we will pick it up.', false)
        }).then(function () { btn.removeAttribute('aria-disabled') })
        return
      }

      /* mailto: hand it to the visitor's own mail client. */
      window.location.href = mailtoFor(data)
      say('Your mail app should be opening with the request filled in &mdash; press send and we will take it from there. Nothing has been charged.')
    })
  }

  /* --- add to calendar --------------------------------------------------
     Built here rather than linked out, so it works with no date service and
     no tracking. With no cohort date set the button says so instead of
     producing an invitation to a day we made up.                          */
  var icsBtn = document.getElementById('icsBtn')
  if (icsBtn) {
    var note = document.getElementById('icsNote')
    var co = CFG.cohort || {}
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
          'UID:' + d + '-academy@deploytlv.com',
          'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
          'DTSTART;TZID=' + (co.timezone || 'Asia/Jerusalem') + ':' + d + 'T' + s,
          'DTEND;TZID=' + (co.timezone || 'Asia/Jerusalem') + ':' + d + 'T' + e,
          'SUMMARY:Deploy Academy 101 — build & ship a website with AI',
          'LOCATION:' + (CFG.venue ? CFG.venue.line : 'Tel Aviv'),
          'DESCRIPTION:Bring a laptop and charger. Nothing to buy in advance.',
          'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n')
        var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
        var a = document.createElement('a')
        a.href = url; a.download = 'deploy-academy-101.ics'
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      })
    }
  }
})()
