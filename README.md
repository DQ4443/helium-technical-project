
## Instructions

Please take a look at the [instructions document.](https://outrageous-nerve-ab9.notion.site/Helium-Full-Stack-Homework-2455f4c835f0809e99ccff933d48313f)

You will be provided a small AI chat-based application that outputs React components given a user prompt, like a simple vibe-code tool. The application is simple, and is prompted to only produce simple isolated components. The components will be outputted into an preview component, and can be seen right in the browser.

## Setup

```bash
# Install dependencies
npm install

# Start frontend (in new terminal)
npm run dev
```

For sake of this exercise, the backend and frontend are completely separate. They do not talk to each other (it is not required to run the backend to complete the frontend portion.)

## Backend

Backend code is in the `backend/` submodule: [go-localization-manager-backend](https://github.com/cloudcaptainai/go-localization-manager-backend)

```
# Install dependencies
cd backend && make install && cd ..

# Start Redis
cd backend && make docker-up

# Start backend (in new terminal)
cd backend && make run
```

## Documentation

Make sure to document your design, the bugs from the backend, and which optional features you implement.
