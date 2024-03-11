import { extractAmounts } from '../scan'
import { receipt1, receipt2, receipt3, receipt4, receipt5, receipt6, receipt7 } from './fixtures'

describe('scan', () => {
  describe('extractAmounts()', () => {
    it('extracts amounts from text', () => {
      const currentYear = String(new Date().getFullYear())

      expect(extractAmounts(`
        Date: 12.03.${currentYear} (March 12th ${currentYear}) at 12:40 (UTC+3)
        Customers: 2

        Service 1 0.00
        Chicken soup 1 2.50
        Beef soup 2 124,46
        Water 3 0.50

        Total: 127.46
        Tip: 20
      `)).toIncludeSameMembers([250, 212446, 12446, 12746, 300, 50, 200, 100, 2000])
    })

    it('handles ambiguous thousands', () => {
      expect(extractAmounts('1 799,00')).toIncludeAllMembers([1799_00, 100, 799_00])
    })

    it('handles wrongly detected characters', () => {
      expect(extractAmounts('зO2I')).toIncludeAllMembers([3021_00])
      expect(extractAmounts('b0s')).toIncludeAllMembers([605_00])
    })

    it('handles ambiguous amounts that might be missing point', () => {
      expect(extractAmounts('79900')).toIncludeAllMembers([799_00, 79900_00])
      expect(extractAmounts('56099')).toIncludeAllMembers([560_99, 56099_00])
    })

    it('parses real receipts', () => {
      expect(extractAmounts(receipt1)).toIncludeAllMembers([386_76, 351_60, 921_36, 1140_48, 3026_73, 3254_95, 3100_00, 3181_68])
      expect(extractAmounts(receipt2)).toIncludeAllMembers([139_00, 229_00, 198_00, 149_00, 554_00, 1418_00])
      expect(extractAmounts(receipt3)).toIncludeAllMembers([364_69, 6_66, 37_79, 140_00, 50_50, 82_90, 53_50])
      expect(extractAmounts(receipt4)).toIncludeAllMembers([48_00, 96_00, 159_00, 93_00, 170_00, 518_00])
      expect(extractAmounts(receipt5)).toIncludeAllMembers([168_00, 25_00, 95_00, 155_00, 275_00, 443_00])
      expect(extractAmounts(receipt6)).toIncludeAllMembers([65_00, 105_00, 180_00, 360_00, 530_00])
      expect(extractAmounts(receipt7)).toIncludeAllMembers([4_50, 78_78, 51_50, 28_32, 60_19, 31_78, 44_98, 32_29])
    })

    it('parses real receipts (snapshots)', () => {
      expect(extractAmounts(receipt1)).toMatchSnapshot()
      expect(extractAmounts(receipt2)).toMatchSnapshot()
      expect(extractAmounts(receipt3)).toMatchSnapshot()
      expect(extractAmounts(receipt4)).toMatchSnapshot()
      expect(extractAmounts(receipt5)).toMatchSnapshot()
      expect(extractAmounts(receipt6)).toMatchSnapshot()
      expect(extractAmounts(receipt7)).toMatchSnapshot()
    })
  })
})