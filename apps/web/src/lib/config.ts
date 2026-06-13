export type PublicConfig = {
    googleEnabled: boolean;
    emailEnabled: boolean;
};

export async function fetchPublicConfig(): Promise<PublicConfig> {
    const response = await fetch("/api/config");
    if (!response.ok) {
        return { googleEnabled: false, emailEnabled: false };
    }
    return response.json();
}
