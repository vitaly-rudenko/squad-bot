import chai from 'chai'

import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import chaiAsPromised from 'chai-as-promised'
import chaiSubset from 'chai-subset'

chai.use(deepEqualInAnyOrder)
chai.use(chaiAsPromised)
chai.use(chaiSubset)

// TODO: rewrite tests to Jest
