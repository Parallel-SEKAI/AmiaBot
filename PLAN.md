# Plan - Add OPENAI_MAX_TOKEN setting

## Goals
- Add `OPENAI_MAX_TOKEN` environment variable support.
- Configure OpenAI chat completions to use the `max_tokens` parameter if set.

## Todo List
- [x] Add `OPENAI_MAX_TOKEN` to `src/config/index.ts` (schema, interface, and config object).
- [x] Add `OPENAI_MAX_TOKEN` to `.env.example`.
- [x] Update `src/features/gemini/feature.ts` to use `max_tokens` in OpenAI API calls.
- [x] Update `src/features/chat/feature.ts` to use `max_tokens` in OpenAI API calls.
- [x] Update `src/features/message-statistics/feature.ts` to use `max_tokens` in OpenAI API calls.
- [x] Update `src/features/netease/commands.ts` to use `max_tokens` in OpenAI API calls.
- [x] Verify all occurrences of `openai.chat.completions.create` are updated.
