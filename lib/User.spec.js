const User = require('./User')

const props = {
    sud: 123456789,
    email: 'test@testieMctestiy.com',
    picture: 'image/url/to/picture',
    name: 'Test Name'
}

describe("User", () => {
    it('is created with props', () => {
        const user = new User(props)
        expect(user.sud).toEqual(123456789)
        expect(user.email).toEqual('test@testieMctestiy.com')
    })
})