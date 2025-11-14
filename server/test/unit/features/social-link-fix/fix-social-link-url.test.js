import { expect } from 'chai'
import { fixSocialLinkUrl } from '../../../../src/social-link-fix/fix-social-link-url.js'

describe('fixSocialLinkUrl()', () => {
  it('fixes necessary Instagram links', () => {
    expect(fixSocialLinkUrl('instagram.com/reel/A-bcdef123/'))
      .to.eq('https://kkinstagram.com/reel/A-bcdef123/')

    expect(fixSocialLinkUrl('https://instagram.com/reel/A-bcdef123/'))
      .to.eq('https://kkinstagram.com/reel/A-bcdef123/')

    expect(fixSocialLinkUrl('https://www.instagram.com/p/A-bcdef123/?igsh=MTYwNDZFAKE2YXh1bA=='))
      .to.eq('https://kkinstagram.com/p/A-bcdef123/')
  })

  it('does not fix other Instagram links', () => {
    expect(fixSocialLinkUrl('https://instagram.com/some_account/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.instagram.com/some_account/')).to.be.undefined
  })

  it('fixes necessary Twitter links', () => {
    expect(fixSocialLinkUrl('x.com/fake_account/status/12345678901234567890'))
      .to.eq('https://fxtwitter.com/fake_account/status/12345678901234567890')

    expect(fixSocialLinkUrl('https://x.com/fake_account/status/12345678901234567890'))
      .to.eq('https://fxtwitter.com/fake_account/status/12345678901234567890')

    expect(fixSocialLinkUrl('https://www.x.com/fake_account/status/12345678901234567890?s=52&t=z296TwCLFAKEEnHNuPEJ4A'))
      .to.eq('https://fxtwitter.com/fake_account/status/12345678901234567890')
  })

  it('does not fix other Twitter links', () => {
    expect(fixSocialLinkUrl('https://x.com/some_account')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.x.com/some_account')).to.be.undefined
  })

  it('fixes necessary Reddit links', () => {
    expect(fixSocialLinkUrl('reddit.com/r/fake_subreddit/s/abcdef1234'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/s/abcdef1234')

    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/s/abcdef1234'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/s/abcdef1234')

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/s/abcdef1234/?hello=world'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/s/abcdef1234/')

    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post')

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post/?hello=world'))
      .to.eq('https://vxreddit.com/r/fake_subreddit/comments/abcdef1234/some_fake_post/')
  })

  it('does not fix other Reddit links', () => {
    expect(fixSocialLinkUrl('https://reddit.com/r/fake_subreddit/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/')).to.be.undefined

    expect(fixSocialLinkUrl('https://reddit.com/user/fake_user/')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.reddit.com/user/fake_user/')).to.be.undefined

    expect(fixSocialLinkUrl('https://www.reddit.com/r/fake_subreddit/comments/1enfakek/comment/lhfake30/')).to.be.undefined
  })

  it('fixes necessary TikTok links', () => {
    expect(fixSocialLinkUrl('vm.tiktok.com/abcdef1234'))
      .to.eq('https://vm.vxtiktok.com/abcdef1234')

    expect(fixSocialLinkUrl('https://vm.tiktok.com/abcdef1234'))
      .to.eq('https://vm.vxtiktok.com/abcdef1234')

    expect(fixSocialLinkUrl('https://www.vm.tiktok.com/abcdef1234/?hello=world'))
      .to.eq('https://vm.vxtiktok.com/abcdef1234/')
  })

  it('does not fix other TikTok links', () => {
    expect(fixSocialLinkUrl('https://tiktok.com/abcdef1234')).to.be.undefined
    expect(fixSocialLinkUrl('https://vm.tiktok.com/abcdef1234/comments')).to.be.undefined
    expect(fixSocialLinkUrl('https://www.vm.tiktok.com/?hello=world')).to.be.undefined
  })

  it('handles errors gracefully', () => {
    expect(fixSocialLinkUrl('invalid_url')).to.be.undefined
  })
})
