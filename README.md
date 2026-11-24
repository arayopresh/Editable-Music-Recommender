# Editable Music Recommender
#Word Count - 1162

Editable taste profiles for AI music recommendation. Individual project for Intelligent Interactive Systems

An AI reads a listening history and writes the listener's taste as short plain-text lines. The listener can read, edit, remove and add lines. Each recommended song is a real song from the Deezer catalogue and names the profile line it came from. The AI can suggest changes but cannot change a line the listener wrote or edited.

## Project status

| Part | Status | Notes |
| --- | --- | --- |
| Profile panel with edit, remove, add and restore | Implemented | Every line is tagged "Written by the AI" or "Your edit" |
| Autonomy guard | Implemented | In `public/core.js`. Model output only becomes a suggestion. A rewrite of a user line is blocked and logged |
| Recommendations that name their profile line | Implemented | Hover or focus a song to highlight its line |
| Activity log | Implemented | Shows every AI and user action, including blocked ones |
| Real songs from Deezer | Implemented | Replay mode takes the most played artist in each genre of the history and asks Deezer for similar songs. Each song has cover art, a 30 second preview and a link |
| Catalogue check | Implemented | Any song that did not come from Deezer, such as one named by the LLM, is searched for on Deezer and tagged "Found on Deezer" or "Not found on Deezer" |
| Scripted responder (replay mode) | Simulated | Rule-based stand-in for the LLM in `public/replay.js`. It writes the profile lines and suggestions and decides which genre fits which line. It is not recorded model output |
| Listening history | Simulated | Fixed sample in `public/data.js`, not a real account |
| Live LLM mode | Implemented| `server.js` makes three LLM calls. |
| Real streaming account | Planned | |
| User study | Planned | |

## Technology stack

- **HTML, CSS and JavaScript modules.** The interface, with no framework and no build step.
- **Node.js 18 or later.** A small server with no packages. It serves the page and makes the LLM calls so the key stays off the browser.
- **Deezer API.** Public and needs no key. `server.js` makes two kinds of call. A search confirms a song exists. An artist radio call returns songs similar to an artist in the history. Deezer does not allow calls straight from a web page, so they go through the server.
- **LLM.** Live mode uses `openai/gpt-oss-120b` through Groq's free API. `server.js` sends the requests in the OpenAI-compatible format, so the provider and model can be changed in `.env` without changing the code. The key is read from `.env` on the server and never sent to the browser.
- **Node test runner.** Thirteen unit tests for the guard and the scripted responder.

## Running or inspecting the work

Replay mode needs no key. It needs an internet connection for the Deezer songs. Without one it falls back to a short offline list and shows songs as "Not checked".

```
git clone https://github.com/arayopresh/Editable-Music-Recommender
cd Editable-Music-Recommender
node server.js
```

Open http://localhost:3000. Then follow the three storyboards from the report.

1. Click **Write my taste profile**. Hover a song to see its line light up.
2. Edit "Preference for classical, instrumental and ambient music" to "Prefer pop music". Click **Update recommendations**. The ambient song is replaced. Click **Play preview** on any song to hear it.
3. Click **Ask the AI to review my profile**. One suggestion appears outside the profile. The log shows the AI's rewrite of your edit was blocked. Click **Dismiss**.

Live mode needs your own key. No key is stored in this repository.

```
cp .env.example .env
# put your key in .env, then
node server.js
```

Choose **Live LLM** at the top of the page.

Run the tests with `npm test`. 


## Development record

-  The project was developed through a series of labs done during the course where I evolved the project as I learnt more information

| File | Commits | What it does |
| --- | --- | --- |
| `package.json` | [f5b4030], [309e5d0], [47f127a] | Sets the project up as ES modules and runs the tests with `npm test` |
| `public/core.js` | [f5b4030], [65283e5], [714baaf], [9dbbbc7], [0bffaeb], [43e8b25], [b6fa79c], [47f127a], [ce4a0bd] | The profile rules. Edit, remove, add and restore lines, tag each line by author, hold AI suggestions, keep the activity log, and run the guard that stops the AI changing a line the user wrote or edited |
| `test/core.test.js` | [043a9c2], [b6fa79c], [de6cc7d] | unit tests for the rules, the guard and the scripted responder |
| `server.js` | [1457741], [0c08890] | Serves the page and makes the Deezer and LLM calls, so the key stays out of the browser |
| `public/index.html` | [f5b4030], [4dd4fa0], [4f5eb0c], [f0c2aa5] | The page layout |
| `public/style.css` | [f5b4030], [4dd4fa0] | The page styling |
| `public/app.js` | [f5b4030], [14f6d17], [b6fa79c] | Draws the page, connects the buttons to the rules and links each song to its profile line |
| `public/replay.js` | [f5b4030], [c5a1178] | The scripted responder, so the app works without a key |
| `public/data.js` | [f5b4030], [b6ca75b], [4f5eb0c] | The simulated listening history and the scripted profile lines and suggestions |
| `public/live.js` | [f5b4030], [675dadb] | Sends requests to the LLM through the server in live mode |
| `public/catalogue.js` | [f5b4030], [efeedae] | Gets song from Deezer and checks each song exists there |
| `.gitignore` | [47f127a] | Keeps `.env` and the key out of the repository |
| `.env.example` | [7e3f0a2] | Template for the `.env` file that holds the LLM settings and key |
| `README.md` | [aa190c0], [31dc957], [57722c5], [c5bbcce] | This file |



## AI assistance

- **Tool.** Claude used through the chat app.
- **What I asked for.** A first version of the project setup and Assignment 1 review used to build on the second report. I also used it for styling the page, running tests and debugging the project code.




## Known limits
- The scripted responder only recognises a small set of genres and phrases such as "only for" and "not".
- The listening history is sample data.
- Deezer's similar-artist results are broad, so a song can sit loosely under its profile line.
- "Not found on Deezer" means no match in that catalogue. It does not prove a song does not exist.
- One listener, one session. Nothing is saved after a refresh.

[aa190c0]: https://github.com/arayopresh/Editable-Music-Recommender/commit/aa190c0
[f5b4030]: https://github.com/arayopresh/Editable-Music-Recommender/commit/f5b4030
[65283e5]: https://github.com/arayopresh/Editable-Music-Recommender/commit/65283e5
[714baaf]: https://github.com/arayopresh/Editable-Music-Recommender/commit/714baaf
[9dbbbc7]: https://github.com/arayopresh/Editable-Music-Recommender/commit/9dbbbc7
[0bffaeb]: https://github.com/arayopresh/Editable-Music-Recommender/commit/0bffaeb
[043a9c2]: https://github.com/arayopresh/Editable-Music-Recommender/commit/043a9c2
[1457741]: https://github.com/arayopresh/Editable-Music-Recommender/commit/1457741
[0c08890]: https://github.com/arayopresh/Editable-Music-Recommender/commit/0c08890
[4dd4fa0]: https://github.com/arayopresh/Editable-Music-Recommender/commit/4dd4fa0
[14f6d17]: https://github.com/arayopresh/Editable-Music-Recommender/commit/14f6d17
[c5a1178]: https://github.com/arayopresh/Editable-Music-Recommender/commit/c5a1178
[b6ca75b]: https://github.com/arayopresh/Editable-Music-Recommender/commit/b6ca75b
[4f5eb0c]: https://github.com/arayopresh/Editable-Music-Recommender/commit/4f5eb0c
[b6fa79c]: https://github.com/arayopresh/Editable-Music-Recommender/commit/b6fa79c
[309e5d0]: https://github.com/arayopresh/Editable-Music-Recommender/commit/309e5d0
[43e8b25]: https://github.com/arayopresh/Editable-Music-Recommender/commit/43e8b25
[47f127a]: https://github.com/arayopresh/Editable-Music-Recommender/commit/47f127a
[675dadb]: https://github.com/arayopresh/Editable-Music-Recommender/commit/675dadb
[efeedae]: https://github.com/arayopresh/Editable-Music-Recommender/commit/efeedae
[f0c2aa5]: https://github.com/arayopresh/Editable-Music-Recommender/commit/f0c2aa5
[7e3f0a2]: https://github.com/arayopresh/Editable-Music-Recommender/commit/7e3f0a2
[ce4a0bd]: https://github.com/arayopresh/Editable-Music-Recommender/commit/ce4a0bd
[de6cc7d]: https://github.com/arayopresh/Editable-Music-Recommender/commit/de6cc7d
[31dc957]: https://github.com/arayopresh/Editable-Music-Recommender/commit/31dc957
[57722c5]: https://github.com/arayopresh/Editable-Music-Recommender/commit/57722c5
[c5bbcce]: https://github.com/arayopresh/Editable-Music-Recommender/commit/c5bbcce

