(function () {
  const target = document.getElementById("typewriter");
  if (!target) return;

  const wrap = document.querySelector(".typewriter-wrap");
  const cursor = document.querySelector(".tw-cursor");
  const charMs = 20; /*50*/
  const pauseAfterLineMs = 950;

  const segments = [
    { kind: "text", value: "Hi" },
    { kind: "break" },
    { kind: "text", value: "Ich bin Julia" },
    { kind: "break" },
    { kind: "text", value: "Cool dass du vorbeischaust" },
    { kind: "break" },
    { kind: "text", value: "Ich studiere KD im 3. Semester (yay)" },
    { kind: "break" },
    { kind: "text", value: "Willst du noch was wissen über mich?" },
    { kind: "break" },
    { kind: "choices" },
  ];

  const responseJa = [
    { kind: "text", value: "Dann erzähle ich dir jetzt noch ein bisschen was, und mehr dann (hoffentlich bald) unterm Dach :D" },
    { kind: "break" },
    {
      kind: "image",
      src: "passbild_pinkgelb2.png",
      alt: "thats me",
      revealLabel: "klick hier",
      imageCaption: [
        {
          kind: "text",
          value:
            "mein Perso-Ausweisfoto",
        },
      ],
      /** Nach dem ersten Hupsi-Durchlauf (Schreibmaschineneffekt unter der Bahn). */
      hupsiFollowup: [
        { kind: "text", value: "anyways." },
        { kind: "break" },
        { kind: "text", value: "Mein Leben zurzeit besteht aus" },
      ],
      /** Unter dem Follow-up: klickbare Wörter → jeweils eigenes Bild (Dateien neben index.html). */
      hupsiKkk: [
        {
          label: "KD",
          src: "kd.gif",
          alt: "KD",
          description: [
            { kind: "text", value: "Fotografie Projekt letztes Semester. "},
            { kind: "break" },
            { kind: "text", value: "Bin noch am Ausprobieren, ob Foto, Coden oder Typo. Finde alles irgendwie cool."},
            { kind: "break" },
            { kind: "text", value: "+ ich finde skaten mega und wünschte ich könnte es besser" },
            { kind: "break" },
          ],
        },
        {
          label: "Kaffee",
          src: "kaffee.gif",
          alt: "Kaffee",
          description: [
            { kind: "text", value: "Seit meiner Zeit im Café Blumen ist Latte Art schon ein skill auf den ich lowkey stolz bin"},
            { kind: "break" },
            { kind: "text", value: "Und ich liebe halt Kaffee (schwarz wenn ich Geld sparen muss, sonst der gute alte Cappuccino mit Hafermilch)"},
            { kind: "break" },
          ],
        },
        {
          label: "Kultur",
          src: "kultur.png",
          alt: "Kultur",
          description: [
            { kind: "text", value: "Das OPEN OHR ist ein jugendkulturpolitisches Festival und findet jährlich zu Pfingsten statt."},
            { kind: "break" },
            { kind: "text", value: "Es wird von 10 Ehrenamtler*innen organisiert und ich bin dieses Jahr mit dabei wohoo"},
            { kind: "break" },
            { kind: "text", value: "Neben einer Drag Show, Podiumsdiskussionen usw haben wir Bands gebucht, die zwar (fast) niemand kennt, aber echt cool sind"},
            { kind: "break" },
          ],
        },
      ],
      /** Nach KD/Kaffee/Kultur: Bild → Klick ersetzt es; darunter Beschreibung (nach dem Tausch, Schreibmaschine). */
      afterKkk: {
        firstSrc: "geschenk.png",
        secondSrc: "catmeme.gif",
        altFirst: "Geschenk",
        altSecond: "Katzenumarmung",
        description: [
          {
            kind: "text",
            value:
              "Das wars! Ich würde mich mega freuen, wenn wir uns bald unterm Dach sehen!",
          },
        ],
      },
    },
  ];

  const responseNein = [
    { kind: "text", value: "Dann eben nicht :(" },
  ];

  let responseRunId = 0;

  /** Ein aktiver Hupsi-Lauf (Timer + Layer) — nicht auf dem DOM-Element speichern (zuverlässiger). */
  let hupsiTimeoutId = null;
  let hupsiTrackEl = null;
  let hupsiFollowupFallbackId = null;
  let hupsiFollowupWrapEl = null;
  let kkkDescriptionRunId = 0;

  /** Muss zur CSS-Animation `hupsi-cross` passen (Dauer eines Durchlaufs). */
  const hupsiAnimDurationMs = 4000;

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function setBoxChecked(box, checked) {
    box.setAttribute("aria-pressed", checked ? "true" : "false");
    box.classList.toggle("is-checked", checked);
  }

  function restoreCursorAfterTypewriter() {
    if (!cursor || !wrap) return;
    wrap.appendChild(cursor);
    cursor.hidden = true;
  }

  function cancelHupsi() {
    if (hupsiTimeoutId != null) {
      clearTimeout(hupsiTimeoutId);
      hupsiTimeoutId = null;
    }
    if (hupsiFollowupFallbackId != null) {
      clearTimeout(hupsiFollowupFallbackId);
      hupsiFollowupFallbackId = null;
    }
    if (hupsiTrackEl && hupsiTrackEl.parentNode) {
      hupsiTrackEl.parentNode.removeChild(hupsiTrackEl);
    }
    hupsiTrackEl = null;
    if (hupsiFollowupWrapEl && hupsiFollowupWrapEl.parentNode) {
      hupsiFollowupWrapEl.parentNode.removeChild(hupsiFollowupWrapEl);
    }
    hupsiFollowupWrapEl = null;
    kkkDescriptionRunId++;
  }

  async function typePlainSegments(container, segs, isAlive, useGlobalCursor) {
    const useMain = useGlobalCursor === true && cursor != null;
    let tip;
    if (useMain) {
      cursor.hidden = false;
      cursor.removeAttribute("hidden");
      container.appendChild(cursor);
      tip = cursor;
    } else {
      const localCursor = document.createElement("span");
      localCursor.className = "hupsi-after-cursor";
      localCursor.setAttribute("aria-hidden", "true");
      localCursor.textContent = "\u258d";
      container.appendChild(localCursor);
      tip = localCursor;
    }
    try {
      if (!segs || segs.length === 0) {
        return true;
      }
      for (let i = 0; i < segs.length; i++) {
        if (!isAlive()) return false;
        const item = segs[i];
        if (item.kind === "break") {
          await wait(pauseAfterLineMs);
          if (!isAlive()) return false;
          container.insertBefore(document.createElement("br"), tip);
          continue;
        }
        if (item.kind !== "text" || !item.value) continue;
        for (let j = 0; j < item.value.length; j++) {
          if (!isAlive()) return false;
          container.insertBefore(
            document.createTextNode(item.value[j]),
            tip
          );
          await wait(charMs);
        }
      }
      return true;
    } finally {
      if (!useMain && tip && tip.parentNode) {
        tip.remove();
      }
    }
  }

  function appendAfterKkkBlock(wrap, post) {
    if (!wrap || !post || !post.firstSrc || !post.secondSrc) return;

    const block = document.createElement("div");
    block.className = "post-kkk";

    const swapImg = document.createElement("img");
    swapImg.className = "post-kkk-swap";
    swapImg.src = post.firstSrc;
    swapImg.alt = post.altFirst != null ? post.altFirst : "";
    swapImg.decoding = "async";
    swapImg.tabIndex = 0;
    swapImg.setAttribute("role", "button");
    swapImg.setAttribute(
      "aria-label",
      post.swapHint != null
        ? post.swapHint
        : "Klicken, um ein anderes Bild zu sehen"
    );

    const descEl = document.createElement("div");
    descEl.className = "post-kkk-desc";

    block.appendChild(swapImg);
    block.appendChild(descEl);
    wrap.appendChild(block);

    let swapped = false;
    function doSwap() {
      if (swapped || !document.body.contains(block)) return;
      swapped = true;

      const descSegs = post.description;
      let descStarted = false;
      function startDesc() {
        if (descStarted || !document.body.contains(block)) return;
        descStarted = true;
        if (!descSegs || descSegs.length === 0) return;
        descEl.setAttribute("aria-live", "polite");
        typePlainSegments(descEl, descSegs, function () {
          return document.body.contains(block);
        }, true);
      }

      swapImg.addEventListener("load", startDesc, { once: true });
      swapImg.addEventListener("error", startDesc, { once: true });
      swapImg.src = post.secondSrc;
      swapImg.alt = post.altSecond != null ? post.altSecond : "";
      swapImg.classList.add("is-swapped");
      swapImg.setAttribute(
        "aria-label",
        post.altSecond != null ? post.altSecond : "Bild"
      );
      if (swapImg.complete) {
        startDesc();
      }
    }

    swapImg.addEventListener("click", doSwap);
    swapImg.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        doSwap();
      }
    });
  }

  function appendHupsiKkk(wrap, items, imageSeg) {
    if (!wrap) return;

    /** Geschenk (afterKkk), sobald der 3. KKK-Text vollständig da ist (Index 2). */
    const KKK_GIFT_AFTER_INDEX = 2;
    let afterKkkAppended = false;
    function tryAppendGiftAfterThirdKkkText() {
      if (
        afterKkkAppended ||
        !imageSeg ||
        !imageSeg.afterKkk ||
        !items ||
        items.length === 0
      ) {
        return;
      }
      if (items.length <= KKK_GIFT_AFTER_INDEX) return;
      afterKkkAppended = true;
      appendAfterKkkBlock(wrap, imageSeg.afterKkk);
    }

    function markThirdKkkReadyIfNeeded(index) {
      if (index !== KKK_GIFT_AFTER_INDEX) return;
      tryAppendGiftAfterThirdKkkText();
    }

    if (items && items.length > 0) {
    const row = document.createElement("div");
    row.className = "kkk-words";

    const view = document.createElement("div");
    view.className = "kkk-image-view";
    const preview = document.createElement("img");
    preview.className = "kkk-preview-img";
    preview.alt = "";
    preview.decoding = "async";
    preview.hidden = true;
    view.appendChild(preview);

    const descEl = document.createElement("div");
    descEl.className = "kkk-description";
    descEl.setAttribute("aria-live", "polite");
    view.appendChild(descEl);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kkk-word";
      btn.textContent = item.label;
      btn.setAttribute(
        "aria-label",
        (item.alt != null ? item.alt : item.label) + " — Bild anzeigen"
      );
      btn.addEventListener("click", function () {
        kkkDescriptionRunId++;
        const myRun = kkkDescriptionRunId;
        descEl.textContent = "";

        preview.hidden = false;
        preview.alt = item.alt != null ? item.alt : item.label;
        const words = row.querySelectorAll(".kkk-word");
        for (let j = 0; j < words.length; j++) {
          words[j].classList.remove("is-active");
        }
        btn.classList.add("is-active");

        const descSegs = item.description;
        if (!descSegs || descSegs.length === 0) {
          preview.src = item.src;
          markThirdKkkReadyIfNeeded(i);
          return;
        }

        function descAlive() {
          return (
            myRun === kkkDescriptionRunId &&
            document.body.contains(wrap) &&
            document.body.contains(descEl)
          );
        }

        let descTypeStarted = false;
        function startDescriptionType() {
          if (descTypeStarted || !descAlive()) return;
          descTypeStarted = true;
          typePlainSegments(descEl, descSegs, descAlive, true).then(
            function (completed) {
              if (
                completed &&
                myRun === kkkDescriptionRunId &&
                document.body.contains(wrap)
              ) {
                markThirdKkkReadyIfNeeded(i);
              }
            }
          );
        }

        preview.addEventListener("load", startDescriptionType, { once: true });
        preview.addEventListener("error", startDescriptionType, { once: true });
        preview.src = item.src;
        if (preview.complete) {
          startDescriptionType();
        }
      });
      row.appendChild(btn);
    }

    wrap.appendChild(row);
    if (cursor) {
      cursor.hidden = false;
      cursor.removeAttribute("hidden");
      row.insertAdjacentElement("afterend", cursor);
    }
    wrap.appendChild(view);
    }

    if (imageSeg && imageSeg.afterKkk && (!items || items.length === 0)) {
      appendAfterKkkBlock(wrap, imageSeg.afterKkk);
    }
  }

  function scheduleHupsi(img, seg) {
    if (seg.hupsi === false) return;
    cancelHupsi();
    const delay = seg.hupsiDelayMs != null ? seg.hupsiDelayMs : 800;
    const src = seg.hupsiSrc != null ? seg.hupsiSrc : "hupsi2.png";
    hupsiTimeoutId = setTimeout(function () {
      hupsiTimeoutId = null;
      if (!img.isConnected || !document.body.contains(img)) return;

      const responseBlock = img.closest(".response-block");
      const imgRow = img.closest(".response-img-row");
      if (!responseBlock || !imgRow) return;

      const track = document.createElement("div");
      track.className = "hupsi-track";

      const lane = document.createElement("div");
      lane.className = "hupsi-lane";
      lane.setAttribute("aria-hidden", "true");

      const runner = document.createElement("img");
      runner.src = src;
      runner.alt = "";
      runner.className = "hupsi-runner";
      runner.decoding = "async";
      runner.style.animationDuration = hupsiAnimDurationMs + "ms";
      runner.addEventListener("error", function () {
        runner.style.outline = "2px dashed currentColor";
        runner.style.minWidth = "80px";
      });

      lane.appendChild(runner);
      track.appendChild(lane);
      imgRow.insertAdjacentElement("afterend", track);
      hupsiTrackEl = track;

      const followupSegs = seg.hupsiFollowup;
      const kkkItems = seg.hupsiKkk;
      let followupStarted = false;
      async function startHupsiFollowup() {
        if (followupStarted) return;
        followupStarted = true;
        if (hupsiFollowupFallbackId != null) {
          clearTimeout(hupsiFollowupFallbackId);
          hupsiFollowupFallbackId = null;
        }
        if (!document.body.contains(track)) return;
        if (
          (!followupSegs || followupSegs.length === 0) &&
          (!kkkItems || kkkItems.length === 0)
        ) {
          return;
        }

        const followWrap = document.createElement("div");
        followWrap.className = "hupsi-followup-wrap";
        const afterEl = document.createElement("div");
        afterEl.className = "hupsi-after";
        followWrap.appendChild(afterEl);
        track.insertAdjacentElement("afterend", followWrap);
        hupsiFollowupWrapEl = followWrap;

        function followupAlive() {
          return (
            document.body.contains(track) &&
            hupsiFollowupWrapEl != null &&
            document.body.contains(hupsiFollowupWrapEl)
          );
        }

        if (followupSegs && followupSegs.length > 0) {
          afterEl.setAttribute("aria-live", "polite");
          await typePlainSegments(afterEl, followupSegs, followupAlive, true);
        }

        if (!followupAlive()) return;
        appendHupsiKkk(followWrap, kkkItems, seg);
      }

      runner.addEventListener(
        "animationiteration",
        startHupsiFollowup,
        { once: true }
      );
      hupsiFollowupFallbackId = setTimeout(function () {
        hupsiFollowupFallbackId = null;
        startHupsiFollowup();
      }, hupsiAnimDurationMs + 80);
    }, delay);
  }

  function emptyResponseHost(host) {
    if (!wrap) return;
    cancelHupsi();
    if (cursor && host.contains(cursor)) {
      wrap.appendChild(cursor);
    }
    host.textContent = "";
    if (cursor) cursor.hidden = true;
  }

  async function typeSegmentsIn(container, segs, isAlive) {
    if (cursor) {
      cursor.hidden = false;
      cursor.removeAttribute("hidden");
      container.appendChild(cursor);
    }
    let lastSegKind = null;
    for (let i = 0; i < segs.length; i++) {
      if (!isAlive()) return;
      const seg = segs[i];
      lastSegKind = seg.kind;
      if (seg.kind === "break") {
        await wait(pauseAfterLineMs);
        if (!isAlive()) return;
        container.appendChild(document.createElement("br"));
        if (cursor) container.appendChild(cursor);
        continue;
      }
      if (seg.kind === "image") {
        await wait(seg.pauseMs != null ? seg.pauseMs : charMs * 3);
        if (!isAlive()) return;
        const reveal = document.createElement("button");
        reveal.type = "button";
        reveal.className = "response-img-reveal";
        reveal.textContent =
          seg.revealLabel != null ? seg.revealLabel : "klick hier";
        const imgSrc = seg.src;
        const imgAlt = seg.alt != null ? seg.alt : "";
        reveal.addEventListener("click", function onReveal() {
          reveal.removeEventListener("click", onReveal);

          const row = document.createElement("span");
          row.className = "response-img-row";
          const photoLine = document.createElement("span");
          photoLine.className = "response-img-photo-line";
          const img = document.createElement("img");
          img.src = imgSrc;
          img.alt = imgAlt;
          img.className = "response-img";
          img.loading = "lazy";
          photoLine.appendChild(img);

          const capSegs = seg.imageCaption;
          if (capSegs && capSegs.length > 0) {
            const captionEl = document.createElement("div");
            captionEl.className = "response-img-caption";
            row.appendChild(captionEl);
            row.appendChild(photoLine);
            reveal.replaceWith(row);
            captionEl.setAttribute("aria-live", "polite");
            typePlainSegments(
              captionEl,
              capSegs,
              function () {
                return document.body.contains(row);
              },
              true
            ).then(function () {
              if (!document.body.contains(row)) return;
              if (cursor) {
                cursor.hidden = false;
                cursor.removeAttribute("hidden");
                photoLine.appendChild(cursor);
              }
              scheduleHupsi(img, seg);
            });
          } else {
            row.appendChild(photoLine);
            reveal.replaceWith(row);
            if (cursor) {
              cursor.hidden = false;
              cursor.removeAttribute("hidden");
              photoLine.appendChild(cursor);
            }
            scheduleHupsi(img, seg);
          }
        });
        container.appendChild(reveal);
        if (cursor) container.appendChild(cursor);
        continue;
      }
      for (let j = 0; j < seg.value.length; j++) {
        if (!isAlive()) return;
        container.appendChild(document.createTextNode(seg.value[j]));
        if (cursor) container.appendChild(cursor);
        await wait(charMs);
      }
    }
    if (lastSegKind !== "image") {
      restoreCursorAfterTypewriter();
    }
  }

  function makeChoice(labelText) {
    const item = document.createElement("span");
    item.className = "choice-item";

    const box = document.createElement("button");
    box.type = "button";
    box.className = "tick-box";
    box.setAttribute("aria-label", labelText);
    box.setAttribute("aria-pressed", "false");

    const cross = document.createElement("span");
    cross.className = "tick-cross";
    cross.setAttribute("aria-hidden", "true");

    box.appendChild(cross);

    const lbl = document.createElement("span");
    lbl.className = "choice-label";
    lbl.textContent = labelText;

    item.appendChild(box);
    item.appendChild(lbl);
    return { item: item, box: box };
  }

  function wireChoice(box, responseSegments, otherBox, responseHost) {
    box.addEventListener("click", function () {
      const on = box.getAttribute("aria-pressed") === "true";
      if (on) {
        setBoxChecked(box, false);
        responseRunId++;
        emptyResponseHost(responseHost);
        return;
      }
      setBoxChecked(otherBox, false);
      setBoxChecked(box, true);
      responseRunId++;
      const runId = responseRunId;
      emptyResponseHost(responseHost);
      typeSegmentsIn(responseHost, responseSegments, function () {
        return runId === responseRunId;
      });
    });
  }

  function appendChoices() {
    const row = document.createElement("span");
    row.className = "choice-row";

    const ja = makeChoice("ja");
    const nein = makeChoice("nein");

    const responseHost = document.createElement("span");
    responseHost.className = "response-block";
    responseHost.setAttribute("aria-live", "polite");

    wireChoice(ja.box, responseJa, nein.box, responseHost);
    wireChoice(nein.box, responseNein, ja.box, responseHost);

    row.appendChild(ja.item);
    row.appendChild(document.createTextNode(" "));
    row.appendChild(nein.item);
    target.appendChild(row);
    target.appendChild(document.createElement("br"));
    target.appendChild(responseHost);
  }

  async function type() {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.kind === "break") {
        await wait(pauseAfterLineMs);
        target.appendChild(document.createElement("br"));
        continue;
      }
      if (seg.kind === "choices") {
        await wait(charMs * 2);
        appendChoices();
        continue;
      }
      for (let j = 0; j < seg.value.length; j++) {
        target.appendChild(document.createTextNode(seg.value[j]));
        await wait(charMs);
      }
    }
    restoreCursorAfterTypewriter();
  }

  type();
})();
