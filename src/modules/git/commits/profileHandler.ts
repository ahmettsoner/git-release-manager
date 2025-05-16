export const profileUrlCache = new Map<string, string>()

export async function prepareProfileUrlsByEMail(email: string): Promise<string | undefined> {
    if (!email) {
        return undefined
    }

    if (!profileUrlCache.has(email)) {
        let profileUrl : string | null = null
        if (process.env.GITHUB_TOKEN) {
            profileUrl = await getGitHubProfileUrl(email, process.env.GITHUB_TOKEN)
        }
        profileUrlCache.set(email, profileUrl ?? `mailto:${email}`)
    }

    return profileUrlCache.get(email)
}

export async function getGitHubProfileUrl(email: string, token?: string): Promise<string | null> {
    const url = `https://api.github.com/search/users?q=${email}`

    try {
        const response = await fetch(url, {
            headers: token
                ? {
                      Authorization: `token ${token}`,
                  }
                : {},
        })

        if (!response.ok) {
            console.error('API Request Failed:', response.statusText)
            return null
        }

        const data = await response.json()
        if (data.total_count > 0 && data.items[0].html_url) {
            return data.items[0].html_url
        } else {
            console.warn('No GitHub profile found for email:', email)
            return null
        }
    } catch (error) {
        console.error('Error fetching GitHub profile:', error)
        return null
    }
}
