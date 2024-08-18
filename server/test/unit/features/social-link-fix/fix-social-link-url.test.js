import { expect } from 'chai'
import { fixSocialLinkUrl } from '../../../../src/social-link-fix/fix-social-link-url.js'

describe('fixSocialLinkUrl()', () => {
  it('fixes Instagram links', () => {
    expect(fixSocialLinkUrl('https://instagram.com/reel/A-bcdef123/'))
      .to.eq('https://ddinstagram.com/reel/A-bcdef123/')

    expect(fixSocialLinkUrl('https://www.instagram.com/p/A-bcdef123/?igsh=MTYwNDZFAKE2YXh1bA=='))
      .to.eq('https://ddinstagram.com/p/A-bcdef123/')
  })

  it('does not fix Instagram links', () => {
    expect(fixSocialLinkUrl('https://instagram.com/some_account/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.instagram.com/some_account/')).to.be.undefined
  })

  it('fixes Twitter links', () => {
    expect(fixSocialLinkUrl('https://x.com/fake_account/status/12345678901234567890'))
      .to.eq('https://fxtwitter.com/fake_account/status/12345678901234567890')

    expect(fixSocialLinkUrl('https://www.x.com/fake_account/status/12345678901234567890?s=52&t=z296TwCLFAKEEnHNuPEJ4A'))
      .to.eq('https://fxtwitter.com/fake_account/status/12345678901234567890')
  })

  it('does not fix Twitter links', () => {
    expect(fixSocialLinkUrl('https://x.com/some_account')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.x.com/some_account')).to.be.undefined
  })

  it('fixes Reddit links', () => {
    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/s/abcdef1234'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/s/abcdef1234')

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/s/abcdef1234/?hello=world'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/s/abcdef1234/')

    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post')

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post/?hello=world'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post/')
  })

  it('does not fix Reddit links', () => {
    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/')).to.be.undefined

    expect(fixSocialLinkUrl('https://reddit.com/user/fake_user/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.reddit.com/user/fake_user/')).to.be.undefined

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/comments/1enfakek/comment/lhfake30/')).to.be.undefined
  })
})
