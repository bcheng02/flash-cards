let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    _accessToken = token;
}

export function getAccessToken() {
    return _accessToken;
}
