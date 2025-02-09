const { prepareProfileUrlsByEMail } = require('../../../src/parsers/commit')

describe('prepareProfileUrlsByEMail', () => {
    beforeEach(() => {})

    it('should return mailto link when email is provided and no GitHub profile is found', async () => {
        
        const email = 'test@example.com'

        
        const result = await prepareProfileUrlsByEMail(email)

        
        expect(result).toBe('mailto:test@example.com')
    })

    it('should return cached value for previously looked up email', async () => {
        
        const email = 'test@example.com'

        
        const firstResult = await prepareProfileUrlsByEMail(email)
        const secondResult = await prepareProfileUrlsByEMail(email)

        
        expect(firstResult).toBe(secondResult)
    })

    it('should handle null or undefined email', async () => {
         & Assert
        expect(await prepareProfileUrlsByEMail(null)).toBeUndefined()
        expect(await prepareProfileUrlsByEMail(undefined)).toBeUndefined()
    })

    it('should handle empty string email', async () => {
        
        const result = await prepareProfileUrlsByEMail('')

        
        expect(result).toBeUndefined()
    })
})
