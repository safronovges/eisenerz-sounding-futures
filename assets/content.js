/* All words on the site live here, in English (en) and German (de).
   Edit freely. Each sound's id must match an entry in audio-data.js.
   text: the description shown in a sound's window. Without a German (de)
   version, German visitors see the English one.
   draft: a suggested description that is not shown; rename it to text to use it.
   credit: an author's name, shown as a signature under the description.
   palette: four colours from darkest to lightest, used for the window
   background and for the file's waveform while it plays. */

window.ESF_CONTENT = {
  ui: {
    en: {
      performance: "the performance",
      background: "the background",
      note: "Rostfest 2026 · Eisenerz",
      language: "Language",
      sounds: "Sounds",
      play: "Play",
      pause: "Pause",
      close: "Close",
      loop: "loop",
      position: "Playback position",
      of: "of",
      loadError: "This sound could not be loaded. Check your connection and press play again.",
      noscript: "This archive needs JavaScript to play. You can still open the recordings directly:"
    },
    de: {
      performance: "die performance",
      background: "der hintergrund",
      note: "Rostfest 2026 · Eisenerz",
      language: "Sprache",
      sounds: "Klänge",
      play: "Abspielen",
      pause: "Pause",
      close: "Schließen",
      loop: "schleife",
      position: "Wiedergabeposition",
      of: "von",
      loadError: "Dieser Klang konnte nicht geladen werden. Prüfe die Verbindung und drücke noch einmal auf Abspielen.",
      noscript: "Zum Abspielen braucht dieses Archiv JavaScript. Die Aufnahmen lassen sich auch direkt öffnen:"
    }
  },

  /* The files on the page, in order from the top left. */
  files: [
    "present", "moss", "stone", "iron-stone", "metal", "threads",
    "distortion-morse", "synth-1", "synth-2", "synth-3", "synth-4",
    "synth-guitar", "violin-looped", "whale-guitar-train", "eisenzukkkkmosserzz"
  ],

  tracks: {
    "present": {
      label: { en: "present", de: "gegenwart" },
      title: { en: "Present", de: "Gegenwart" },
      subtitle: { en: "Neutral", de: "Neutral" },
      eyebrow: { en: "sound world 01", de: "Klangwelt 01" },
      draft: {
        en: "The present, held neutral. A calm, light ambience of bowed, violin-like tones, with slow movement and a trace of air and rosin. The five futures branch off from here.",
        de: "Die Gegenwart, neutral gehalten. Eine ruhige, helle Fläche aus gestrichenen, geigenähnlichen Tönen, mit langsamer Bewegung und einem Hauch von Luft und Kolophonium. Von hier zweigen die fünf Zukünfte ab."
      },
      meta: { en: "196 Hz · 64 s cycle · seed 1975", de: "196 Hz · Zyklus 64 s · Seed 1975" },
      palette: ["#26201b", "#6f6558", "#bdb2a2", "#f1ece3"],
      loop: true
    },
    "moss": {
      label: { en: "moss", de: "moos" },
      title: { en: "Moss", de: "Moos" },
      subtitle: { en: "The return to nature", de: "Die Rückkehr zur Natur" },
      eyebrow: { en: "sound world 02", de: "Klangwelt 02" },
      draft: {
        en: "People look for new ways to live in tune with nature. A slow sine-wave chord with soft upper partials and a faint pulse. Over the cycle it grows brighter, more textured and more strongly pulsed.",
        de: "Die Menschen suchen nach neuen Wegen, im Einklang mit der Natur zu leben. Ein langsamer Sinus-Akkord mit weichen Obertönen und einem leisen Puls. Im Lauf des Zyklus wird er heller, dichter und deutlicher pulsierend."
      },
      meta: { en: "165 Hz · 64 s cycle · seed 1975", de: "165 Hz · Zyklus 64 s · Seed 1975" },
      palette: ["#0f2117", "#2f5a35", "#8fb26a", "#e1ebc8"],
      loop: true
    },
    "stone": {
      label: { en: "stone", de: "stein" },
      title: { en: "Stone", de: "Stein" },
      subtitle: { en: "The empty city", de: "Die leere Stadt" },
      eyebrow: { en: "sound world 03", de: "Klangwelt 03" },
      draft: {
        en: "More and more people move to the big cities, and smaller towns are slowly left behind. Hollow stone resonance, wind, distant footsteps and long echoes through empty streets.",
        de: "Immer mehr Menschen ziehen in die Großstädte, kleinere Orte werden nach und nach verlassen. Hohle Steinresonanz, Wind, ferne Schritte und lange Echos in leeren Straßen."
      },
      meta: { en: "72 Hz · 64 s cycle · seed 1975", de: "72 Hz · Zyklus 64 s · Seed 1975" },
      palette: ["#1a1e22", "#4d5963", "#a9b4bc", "#e8ecee"],
      loop: true
    },
    "iron-stone": {
      label: { en: "iron stone", de: "eisenstein" },
      title: { en: "Iron stone", de: "Eisenstein" },
      subtitle: { en: "The industrial takeover", de: "Die industrielle Übernahme" },
      eyebrow: { en: "sound world 04", de: "Klangwelt 04" },
      draft: {
        en: "As the iron mine keeps expanding, people leave their homes and industry pushes out the life that was there. Underground rumble, moving air and metallic impacts, joined by cavern reflections as the cycle develops.",
        de: "Während sich das Eisenbergwerk immer weiter ausdehnt, verlassen die Menschen ihre Heimat, und die Industrie verdrängt das bisherige Leben. Unterirdisches Grollen, bewegte Luft und metallische Schläge, zu denen im Lauf des Zyklus der Hall einer Kaverne kommt."
      },
      meta: { en: "rumble 0.68 · metal 0.65 · 64 s cycle", de: "Grollen 0,68 · Metall 0,65 · Zyklus 64 s" },
      palette: ["#220e07", "#6e2a12", "#c45f30", "#f2b48b"],
      loop: true
    },
    "metal": {
      label: { en: "metal", de: "metall" },
      title: { en: "Metal", de: "Metall" },
      subtitle: { en: "The AI future", de: "Die KI-Zukunft" },
      eyebrow: { en: "sound world 05", de: "Klangwelt 05" },
      draft: {
        en: "Artificial intelligence reaches the countryside, and digital technology becomes part of everyday life. A 165 Hz tone, frequency-modulated and cut by an exact 4 Hz gate, steps through an E–G–B arpeggio over a calm, breathing field. Its glitches follow a fixed score, 20260814.",
        de: "Künstliche Intelligenz erreicht auch den ländlichen Raum, digitale Technologien werden Teil des Alltags. Ein 165-Hz-Ton, frequenzmoduliert und von einem exakten 4-Hz-Gate zerschnitten, schreitet über einer ruhig atmenden Fläche ein E-G-H-Arpeggio ab. Seine Störungen folgen einer festen Partitur, 20260814."
      },
      meta: { en: "165 Hz · 4 Hz gate · 64 s cycle", de: "165 Hz · Gate 4 Hz · Zyklus 64 s" },
      palette: ["#121320", "#3d4060", "#9ea2c8", "#e6e6f4"],
      loop: true
    },
    "threads": {
      label: { en: "threads", de: "fäden" },
      title: { en: "Threads", de: "Fäden" },
      subtitle: { en: "Community development", de: "Gemeinschaftliche Entwicklung" },
      eyebrow: { en: "sound world 06", de: "Klangwelt 06" },
      draft: {
        en: "People join forces, share what they know and shape their future together. Warm threads of sound weave around a shared pitch and a shared pulse and gather into a wider common field.",
        de: "Die Menschen schließen sich zusammen, teilen ihr Wissen und gestalten gemeinsam ihre Zukunft. Warme Klangfäden verweben sich um eine gemeinsame Tonhöhe und einen gemeinsamen Puls und sammeln sich zu einem weiten, gemeinsamen Feld."
      },
      meta: { en: "132 Hz · 64 s cycle · seed 1975", de: "132 Hz · Zyklus 64 s · Seed 1975" },
      palette: ["#26121a", "#7a3d4f", "#d38f98", "#f6d9d2"],
      loop: true
    },

    "distortion-morse": {
      label: { en: "distortion morse", de: "distortion morse" },
      title: { en: "Distortion morse", de: "Distortion morse" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "Among fuzzy, reverberating noise we find morse code. “-.. . .- - ....”, or “D-E-A-T-H”\nYet this death contorts, reshapes, grows nebulous and spiked. It is one step away from rebirth."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#180807", "#5c1510", "#c23a26", "#f4a184"]
    },
    "synth-1": {
      label: { en: "synth 1", de: "synth 1" },
      title: { en: "Synth 1", de: "Synth 1" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "Piano keys and violin strings float in reverse across a rain-soaked terrain. Nothing sticks: instead the sound glides. Light and nimble."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#1d1409", "#6d4a1d", "#d19b4b", "#f6deb0"]
    },
    "synth-2": {
      label: { en: "synth 2", de: "synth 2" },
      title: { en: "Synth 2", de: "Synth 2" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "A cold but merry rhythm. Snow. Flute notes. There may be Christmas bells, in time. But nothing stays forever."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#0b1a1c", "#255a5c", "#79b1a7", "#d8efe7"]
    },
    "synth-3": {
      label: { en: "synth 3", de: "synth 3" },
      title: { en: "Synth 3", de: "Synth 3" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "Morphing, echoing, reversing. Then: a blooming sound. Growing bigger. “synth 3” is proud, but young. Something new is coming, but it has yet to take full shape."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#100e24", "#352d68", "#8676c0", "#e0d9f4"]
    },
    "synth-4": {
      label: { en: "synth 4", de: "synth 4" },
      title: { en: "Synth 4", de: "Synth 4" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "Storming. An echo eats away at an echo. The mountain speaks to the river and the river speaks back to the mountain. Beneath the cobblestone, inside the caves. Grand, grand, grand echo. An echo as an answer to a call. Then the echo answers the echo. On and on, the keyboard sounds."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#17170f", "#4b4b33", "#a3a175", "#ebe9cf"]
    },
    "synth-guitar": {
      label: { en: "synth guitar", de: "synth guitar" },
      title: { en: "Synth guitar", de: "Synth guitar" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "Nightfall. Little feet pitter-patter across guitar notes. Mice, bugs, cats, birds. There will always be children. The guitar waits for morning."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#1c1016", "#5e3550", "#b77a9e", "#f0d6e4"]
    },
    "violin-looped": {
      label: { en: "violin looped", de: "violin looped" },
      title: { en: "Violin looped", de: "Violin looped" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "A fiddle folk tune, misremembered. A distant memory of playing a violin piece, suddenly falling apart. Diluting like water colour on wet paper. A string vibrates and fills the entire town in bright sound. The streets are warm. They are not empty."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#22150b", "#76502b", "#d0a066", "#f6e4c6"]
    },
    "whale-guitar-train": {
      label: { en: "whale guitar train", de: "whale guitar train" },
      title: { en: "Whale guitar train", de: "Whale guitar train" },
      eyebrow: { en: "eisenerz · august 2026", de: "Eisenerz · August 2026" },
      text: {
        en: "In years upon years upon years the water levels have risen. A flood – deluge. A mother whale and her calf travel around the mountain top sticking above ocean level like a glorious island. Underwater, a train travels. The whale will tell her story."
      },
      meta: { en: "44.1 kHz · 24 bit · stereo", de: "44,1 kHz · 24 Bit · Stereo" },
      palette: ["#07131e", "#1b4562", "#6a9cc0", "#d3e6f2"]
    },
    "eisenzukkkkmosserzz": {
      label: { en: "eisenzukkkkmosserzz", de: "eisenzukkkkmosserzz" },
      title: { en: "Eisenzukkkkmosserzz", de: "Eisenzukkkkmosserzz" },
      eyebrow: { en: "eisenerz · 2026", de: "Eisenerz · 2026" },
      text: {
        en: "The ghosts of remembrance, digitalised, time memories stretched. The forgotten river flows, safeguarded by the chimerical moss chants. Pasado, Present and Zukunft, intertwined, drrrrrrrrrr. Never ending mountainous funeral."
      },
      credit: "Sofia Gutierrez (FIA)",
      meta: { en: "44.1 kHz · 16 bit · stereo", de: "44,1 kHz · 16 Bit · Stereo" },
      palette: ["#10140f", "#3c4f3a", "#a7c49a", "#efe9f6"]
    }
  },

  /* The two text windows, in English only: German visitors see the English text.
     Add a de version next to en to translate a window. A block is either a
     paragraph (a string), a list of futures that open their sound windows,
     or a credits list. */
  pages: {
    performance: {
      title: { en: "The performance" },
      blocks: {
        en: [
          "During the Rostfest of August 2026, we sounded out different manifestations of the town’s futures using a biosonification device to interact with moss and other flora, coded musical interpretations, as well as instruments recorded with looping pedals, reversed with added reverb and distortion. Each track tells a different story: from mellifluous melodies to static, textured notes. The participatory event invited the town community as collaborators and considers Eisenerz as far more than its prevalent history and reputation. A site of creativity and ground ready to flourish: sounding futures come alive – and are still alive! The archive can always be added to."
        ]
      }
    },

    background: {
      title: { en: "The background" },
      blocks: {
        en: [
          "Being one of the main mediums of our perception of the world, sound is often completely overlooked as a part of our daily lives. Thinking about our future, we usually think about what it looks like, but never how it sounds.",
          "During the “Sounding Futures” investigation, we challenged that perspective, speculating our own future envisioning and encouraging others to do the same: observe, imagine and wish for their futures in the form of sound.",
          "As students from the Bachelor’s program “Transformation Studies. Art x Science”, we have been in touch with the town of Eisenerz ever since our first semester. As we have pondered the extractivist history of this place and its iron ore mining site, as well as the small yet lively community inhabiting it, our group has made an effort to apply our framework of thinking sounds on the field: imagine how different scenarios of the town development could affect its future sound. Would it be more industrial? Would it be calmer? Would it be structured or chaotic?",
          { futures: [
            ["stone", "The empty city"],
            ["metal", "The AI future"],
            ["moss", "The return to nature"],
            ["iron-stone", "The industrial takeover"],
            ["threads", "Community development"]
          ] },
          { credits: [
            ["Team", "Amelie Atsch, Lena Gramlinger, Sofía Gutiérrez Escobar, Diana Kho, Raphaela Leitner, Egor Safronov, Karin Reisinger"],
            ["Course", "Art x Science School for Transformation, University of Applied Arts Vienna"],
            ["Festival", "Rostfest 2026, Eisenerz", "https://www.rostfest.at"],
            ["Reading", "Karin Reisinger, “Two Mining Areas: Spaces of Care amid Extraction”, Architecture and Culture 11 (3–4), 2023", "https://doi.org/10.1080/20507828.2023.2219115"]
          ] }
        ]
      }
    }
  }
};
