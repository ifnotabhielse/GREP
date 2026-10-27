import type { CSSProperties } from "react";

/** Static sections of the home page, ported 1:1 from legacy/index.html. */

const v = (vars: Record<string, string>) => vars as CSSProperties;

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <p className="eyebrow">Now forming in Hyderabad</p>
        <h1 className="hero-title" id="hero-title">
          <span>Find your</span>
          <span className="grad">6 AM people.</span>
        </h1>
        <p className="lede">
          GREP puts you in a small group of 3 to 6 people who train at your level, toward the same target, at times you can actually make.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary btn-lg" href="#join">
            Join a cohort
          </a>
          <a className="link" href="#how">
            See how it works ›
          </a>
        </div>

        <div className="match" aria-label="Example of a GREP cohort">
          <div className="match-top">
            <span className="tag">Example match</span>
            <span>Gachibowli · Tue, Thu, Sat · 6:00&nbsp;AM</span>
          </div>
          <h2 className="match-title">Half Marathon cohort</h2>
          <p className="match-sub">Race in Feb 2027 · easy runs, one long run a week</p>

          <div
            className="ruler"
            role="img"
            aria-label="Easy pace band from 6:30 to 7:15 per kilometre with five runners inside it, including you at 6:52"
          >
            <div className="ruler-track">
              <div className="band" style={{ left: "40%", width: "30%" }}>
                <span className="band-label">Easy pace 6:30–7:15 /km</span>
              </div>
              <span className="dot" style={v({ left: "42.7%", "--d": ".35s" })}></span>
              <span className="dot" style={v({ left: "47.3%", "--d": ".45s" })}></span>
              <span className="dot you" style={v({ left: "54.7%", "--d": ".55s" })}></span>
              <span className="dot" style={v({ left: "62%", "--d": ".65s" })}></span>
              <span className="dot" style={v({ left: "66.7%", "--d": ".75s" })}></span>
            </div>
            <div className="ticks" aria-hidden="true">
              <span style={{ left: 0 }}>5:30</span>
              <span style={{ left: "20%" }}>6:00</span>
              <span style={{ left: "40%" }}>6:30</span>
              <span style={{ left: "60%" }}>7:00</span>
              <span style={{ left: "80%" }}>7:30</span>
              <span style={{ left: "100%" }}>8:00</span>
            </div>
          </div>

          <div className="match-foot">
            <div>
              <b>5</b>
              <span>People</span>
            </div>
            <div>
              <b>3 / week</b>
              <span>Sessions</span>
            </div>
            <div>
              <b>12</b>
              <span>Weeks to race day</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Statement() {
  return (
    <section className="statement" aria-label="Why GREP">
      <div className="wrap">
        <p>
          Most training plans fall apart at 5:45&nbsp;AM, when nobody is waiting for you. <span className="hi">With GREP, four people are.</span>
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title">
      <div className="wrap">
        <p className="eyebrow">How it works</p>
        <h2 className="section-title" id="how-title">
          From sign-up to race day.
        </h2>
        <ol className="steps">
          <li>
            <span className="step-num">Step 1</span>
            <h3>Tell us your goal</h3>
            <p>Your next target, your current pace or training volume, and the slots you can train in.</p>
          </li>
          <li>
            <span className="step-num">Step 2</span>
            <h3>Get matched</h3>
            <p>We place you in a cohort of 3 to 6 people at your pace, near you, on a schedule that works for everyone.</p>
          </li>
          <li>
            <span className="step-num">Step 3</span>
            <h3>Train to race day</h3>
            <p>A fixed meeting point, a shared weekly plan and a group chat. People expect you there, so you show up.</p>
          </li>
        </ol>
        <p className="after">
          <strong>After race day,</strong> set your next goal and we match you again.
        </p>
      </div>
    </section>
  );
}

const WEEKS = ["28%", "36%", "44%", "30%", "50%", "58%", "66%", "44%", "74%", "84%", "54%"];

export function Bento() {
  return (
    <section aria-labelledby="match-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <p className="eyebrow">The match</p>
        <h2 className="section-title" id="match-title">
          Matched on what matters.
        </h2>

        <div className="bento">
          <article className="tile t-pace">
            <p className="kicker">Pace</p>
            <h3>Grouped by your easy pace.</h3>
            <p>Runners in a cohort sit inside one narrow pace band, so nobody waits and nobody chases.</p>
            <div className="viz stat">
              <span className="stat-num">
                45<small>sec</small>
              </span>
              <span className="stat-cap">Widest gap per km between runners in the same cohort.</span>
            </div>
          </article>

          <article className="tile t-goal">
            <p className="kicker">Goal</p>
            <h3>Same target, same race day.</h3>
            <p>Everyone trains toward one date, so one plan fits the whole group, recovery weeks included.</p>
            <div className="viz" aria-label="A 12-week training block that builds, with lighter weeks 4, 8 and 11, ending on race day">
              <div className="weeks" aria-hidden="true">
                {WEEKS.map((h, i) => (
                  <span key={i} style={v({ "--h": h })}></span>
                ))}
                <span className="race" style={v({ "--h": "100%" })}></span>
              </div>
              <div className="weeks-labels" aria-hidden="true">
                <span>Week 1</span>
                <span>Race day</span>
              </div>
            </div>
          </article>

          <article className="tile t-sched">
            <p className="kicker">Schedule</p>
            <h3>Slots you can make.</h3>
            <div className="viz slots" aria-label="Example slots">
              <span className="slot">
                <b>Tue</b> 6:00&nbsp;AM
              </span>
              <span className="slot">
                <b>Thu</b> 6:00&nbsp;AM
              </span>
              <span className="slot">
                <b>Sat</b> 5:30&nbsp;AM
              </span>
            </div>
          </article>

          <article className="tile t-area">
            <p className="kicker">Area</p>
            <h3>Close to home or work.</h3>
            <ul className="viz areas" aria-label="Areas we're starting with">
              <li>Gachibowli</li>
              <li>Financial District</li>
              <li>Kondapur</li>
              <li>Madhapur</li>
              <li>Jubilee Hills</li>
            </ul>
          </article>

          <article className="tile t-group">
            <p className="kicker">Group</p>
            <h3>3 to 6 people.</h3>
            <p>Small enough to know everyone. Big enough that the session still happens when someone skips.</p>
            <div className="viz people" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span className="me"></span>
              <em>and you</em>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <p className="eyebrow">Questions</p>
        <h2 className="section-title" id="faq-title">
          Good to know.
        </h2>
        <div className="faq">
          <details>
            <summary>What if there&apos;s no cohort for my goal yet?</summary>
            <p>Sign up anyway. We keep your details and open a cohort once enough people at your pace, in your area, want the same thing.</p>
          </details>
          <details>
            <summary>Do I need a smartwatch?</summary>
            <p>
              No. A rough idea of your pace or weekly training is enough. If you use Apple Watch, Garmin, WHOOP or Strava, your numbers make the
              match more accurate.
            </p>
          </details>
          <details>
            <summary>How do cohorts meet?</summary>
            <p>In person, at a fixed meeting point, on the agreed days. Each cohort also gets a WhatsApp group and a shared weekly plan.</p>
          </details>
          <details>
            <summary>Who can join?</summary>
            <p>Anyone 18 or older. The first cohorts are in Hyderabad. Other cities open when enough people there sign up.</p>
          </details>
        </div>
      </div>
    </section>
  );
}
