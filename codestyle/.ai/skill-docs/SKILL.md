---
name: skill-docs
description: "Creates, edits, and reviews user and developer documentation in Russian and English. Preserves facts, technical literals, and certainty; makes text actionable, natural, and audience-fit. Use for README, guides, architecture notes, and CLI documentation; not for code, configuration, or chat."
---

# Skill docs

Produce documentation the reader can understand, verify, and apply without guessing. Accuracy over expressiveness; clarity over literal fidelity to the source phrase.

## Before writing

Identify language, audience, document type, fact sources, and the reader's required outcome. Priority order: user request, repository rules, the [GLOSSARY.ru.md](../../GLOSSARY.ru.md)/[GLOSSARY.md](../../GLOSSARY.md) pair, this skill.

Do not assume translation is wanted. If the repository has paired Russian/English versions, or the user asks for both, synchronize them by technical meaning; wording need not match verbatim.

Pick the mode that matches the request:

- Create: produce finished text; flag missing critical facts explicitly.
- Edit: change only the agreed scope; keep the author's voice unless it blocks clarity.
- Review: separate dangerous errors, material ambiguities, and optional style improvements. Do not rewrite when only an analysis was requested.

## Facts and technical meaning

Collect confirmed facts first: system state, conditions, roles, order of actions, check results, limitations, known recovery paths. Plan, launch, observation, and proven result are different states.

Do not add facts, causes, consequences, numbers, dates, promises, compatibility, safety, idempotency, ownership, or check results. Do not infer causality from sequence. If a needed fact is unknown, ask a precise question or leave an explicit gap.

Keep code, commands, flags, paths, URLs, API names, identifiers, versions, values, error messages, normative words, and mandatory step order verbatim. In Markdown, mark such fragments as code when it helps tell them from prose. Do not edit quotations without explicit permission.

Place a warning before the action it applies to. Do not call an action safe, reversible, or successful without a source. For every mentioned check, state its known result or say honestly that it is unknown.

## Structure for the reader

Pick the shortest form that keeps every critical condition, limitation, or warning. Add no sections, lists, tables, or examples just to follow a template.

User documentation: plain-language goal, required conditions, ordered steps, observable result, known errors and limitations. Skip internals unless they help the user succeed.

Developer documentation: purpose and boundaries, contract or invariants, dependencies and preconditions, exact procedure, verification method, known limitations. In CLI documentation, keep syntax, parameters, defaults, results, and errors separate.

## Language

Write in the reader's natural language, not a calque. Keep a term in the source interface's language when translating would make it hard to find; briefly explain a term on first use if the reader needs it.

Russian: direct verbs, natural government, normal word order. Remove officialese, empty openers, promotional judgments, template announcements, headline paraphrase, and empty endings. Do not trade precise technical wording for conversational tone. Use dashes and hyphens per language norms; no mechanical bans on constructions or marks.

English: idiomatic and direct. Prefer concrete verbs; active voice when the actor matters; short links between steps. Do not carry over Russian punctuation or word order. No marketing promises, vague attributions, or boilerplate conclusions.

In both languages, one idea per sentence or short connected fragment. Keep lists, parallel constructions, and repetition when they express real structure, a term, or a contract. Treat machine-text markers as signals, not automatic errors.

## Editorial pass

Check content first, then language. Never trade meaning for style.

1. Verify every fact, number, condition, technical literal, order, and evidence boundary against sources.
2. Check usefulness for the chosen reader: what they learn, do, or verify; can they perform the key action without a missed condition?
3. Remove only contextually confirmed machine-style markers: filler, nominalizations instead of actions, false significance, officialese, unexplained jargon, duplication, decorative enthusiasm.
4. Reread as a native speaker of the language. Check terms against the glossary pair and the paired document.

If an edit could change a fact, obligation, risk, conclusion, claim strength, or the author's position, do not make it silently: raise a short question with an option.

## Before recording

Write only the final material to external surfaces, without internal editing reports. After writing, briefly report where the text went and which checks ran.

## Nuckty specifics

Bilingual by suffix: `.ru.md` Russian, `.md` English; edit paired versions in sync. Typography (short dash, non-breaking spaces) is set by the engine — never hand-code it. No self-evident filler: never state what a name or the contents already show. Before reporting ready, grep the whole corpus for calques and glued words, including unchanged lines. Voice: match existing documentation of the same kind and the `Русская проза` section of `GLOSSARY.ru.md`; open a neighboring page before writing a new one.
