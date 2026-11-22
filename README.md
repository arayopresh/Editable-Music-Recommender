# Editable Music Recommender

Editable taste profiles for AI music recommendation. Individual project for Intelligent Interactive Systems

An AI reads a listening history and writes the listener's taste as short plain-text lines. The listener can read, edit, remove and add lines. Each recommended track is a real song from the Deezer catalogue and names the profile line it came from. The AI can suggest changes but cannot change a line the listener wrote or edited.

## Project status

| Part | Status | Notes |
| --- | --- | --- |
| Profile panel with edit, remove, add and restore | Implemented | Every line is tagged "Written by the AI" or "Your edit" |
| Autonomy guard | Implemented | In `public/core.js`. Model output only becomes a suggestion. A rewrite of a user line is blocked and logged |
| Recommendations that name their profile line | Implemented | Hover or focus a track to highlight its line |
| Activity log | Implemented | Shows every AI and user action, including blocked ones |
| Real tracks from Deezer | Implemented | Replay mode takes the most played artist in each genre of the history and asks Deezer for similar tracks. Each track has cover art, a 30 second preview and a link |
| Catalogue check | Implemented | Any track that did not come from Deezer, such as one named by the LLM, is searched for on Deezer and tagged "Found on Deezer" or "Not found on Deezer" |
| Scripted responder (replay mode) | Simulated | Rule-based stand-in for the LLM in `public/replay.js`. It writes the profile lines and suggestions and decides which genre fits which line. It is not recorded model output |
| Listening history | Simulated | Fixed sample in `public/data.js`, not a real account |
| Live LLM mode | Implemented| `server.js` makes three LLM calls. |
| Real streaming account | Planned | |
| User study | Planned | Phase 3 |

## Technology stack

- **HTML, CSS and JavaScript modules.** The interface, with no framework and no build step.
- **Node.js 18 or later.** A small server with no packages. It serves the page and makes the LLM calls so the key stays off the browser.
- **Deezer API.** Public and needs no key. `server.js` makes two kinds of call. A search confirms a track exists. An artist radio call returns real tracks similar to an artist in the history. Deezer does not allow calls straight from a web page, so they go through the server.
- **LLM.** Live mode uses `openai/gpt-oss-120b` through Groq's free API. `server.js` sends the requests in the OpenAI-compatible format, so the provider and model can be changed in `.env` without changing the code. The key is read from `.env` on the server and never sent to the browser.
- **Node test runner.** Thirteen unit tests for the guard and the scripted responder.

## Running or inspecting the work

Replay mode needs no key. It needs an internet connection for the Deezer tracks. Without one it falls back to a short offline list and shows tracks as "Not checked".

```
git clone https://github.com/arayopresh/Editable-Music-Recommender
cd Editable-Music-Recommender
node server.js
```

Open http://localhost:3000. Then follow the three storyboards from the report.

1. Click **Write my taste profile**. Hover a track to see its line light up.
2. Edit "Preference for classical, instrumental and ambient music" to "Ambient only for sleep, not for everyday listening". Click **Update recommendations**. The ambient track is replaced. Click **Play preview** on any track to hear it.
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

-  I started from a draft made with Claude to get an idea on how approach the building process, then rebuilt it in my own repository. 

## What each file does 

- **`core.js`.** The profile rules and the guard that stops the AI changing user written lines. 
- **`core.test.js`.** Tests the rules.
- **`server.js`.** Serves the page and calls Deezer and the LLM, so the key stays off the browser. Uses Groq's free tier.
- **`index.html` and `style.css`.** The layout, with a panel stating what the AI can and cannot do.
- **`app.js`.** Draws the page, tags each line by author, and links each track to its profile line.
- **`data.js`.** The simulated listening history
- **`replay.js`.** A simulated AI so the app works without a key.
- **`catalogue.js`.** Checks every song exists on Deezer.
- **`live.js`.** Sends requests to the LLM in live mode.



## AI assistance

- **Tool.** Claude used through the chat app.
- **What I asked for.** A first version of the project setup and Assignment 1 review used to build on the second report. I also used it for running tests and debugging the project code.
- **What is mine.** The topic, the gap, the choice to make the profile editable, and the fixes that came from my own Lab 3 testing.



## Known limits
- The scripted responder only recognises a small set of genres and phrases such as "only for" and "not".
- The listening history is sample data.
- Deezer's similar-artist results are broad, so a track can sit loosely under its profile line.
- "Not found on Deezer" means no match in that catalogue. It does not prove a track does not exist.
- One listener, one session. Nothing is saved after a refresh.

