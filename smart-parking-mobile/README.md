# Smart Parking UTN Mobile

Expo app for Smart Parking UTN. It talks to the Spring Boot API and uses device location to validate whether the user is inside the UTN campus.

## Run

```bash
npm install
npm start
```

Open the QR with Expo Go.

## API URL

Set the backend URL in `.env`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.100.9:8080/api
```

Use your PC LAN IP, not `localhost`, when testing from a phone.

## Demo user

```text
12345 / secreto
```
