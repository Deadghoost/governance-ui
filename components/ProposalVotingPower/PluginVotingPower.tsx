import classNames from 'classnames'
import useDepositStore from 'VoteStakeRegistry/stores/useDepositStore'

import { useMintInfoByPubkeyQuery } from '@hooks/queries/mintInfo'
import { useRealmQuery } from '@hooks/queries/realm'
import { useMemo } from 'react'
import { BigNumber } from 'bignumber.js'
import clsx from 'clsx'
import { useRealmVoterWeightPlugins } from '@hooks/useRealmVoterWeightPlugins'
import QuadraticVotingInfoModal from './QuadraticVotingInfoModal'
import { useMembersQuery } from '@components/Members/useMembers'
import { useJoinRealm } from '@hooks/useJoinRealm'
import { Transaction } from '@solana/web3.js'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'
import Button from '@components/Button'
import { sendTransaction } from '@utils/send'
import { TokenDeposit } from '@components/TokenBalance/TokenDeposit'
import { GoverningTokenRole } from '@solana/spl-governance'
import { useLegacyVoterWeight } from '@hooks/queries/governancePower'

interface Props {
  className?: string
  role: 'community' | 'council'
}

export default function PluginVotingPower({ role, className }: Props) {
  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected
  const { connection } = useConnection()
  const realm = useRealmQuery().data?.result
  const { data: activeMembersData } = useMembersQuery()
  const {
    userNeedsTokenOwnerRecord,
    userNeedsVoterWeightRecords,
    handleRegister,
  } = useJoinRealm()
  const mintInfo = useMintInfoByPubkeyQuery(realm?.account.communityMint).data
    ?.result

  const activeMembers = useMemo(() => activeMembersData, [activeMembersData])

  const isLoading = useDepositStore((s) => s.state.isLoading)
  const {
    calculatedVoterWeight,
    isReady,
    calculatedMaxVoterWeight,
  } = useRealmVoterWeightPlugins(role)
  const { result: ownVoterWeight } = useLegacyVoterWeight()

  const formattedTokenAmount = useMemo(
    () =>
      mintInfo && ownVoterWeight?.communityTokenRecord
        ? new BigNumber(
            ownVoterWeight?.communityTokenRecord?.account?.governingTokenDepositAmount?.toString()
          )
            .shiftedBy(-mintInfo.decimals)
            .toFixed(2)
            .toString()
        : undefined,
    [mintInfo, ownVoterWeight?.communityTokenRecord]
  )

  const formattedMax =
    mintInfo && calculatedMaxVoterWeight?.value
      ? new BigNumber(calculatedMaxVoterWeight?.value.toString())
          .shiftedBy(-mintInfo.decimals)
          .toString()
      : undefined

  const formattedTotal = useMemo(
    () =>
      mintInfo && calculatedVoterWeight?.value
        ? new BigNumber(calculatedVoterWeight?.value.toString())
            .shiftedBy(-mintInfo.decimals)
            .toFixed(2)
            .toString()
        : undefined,
    [mintInfo, calculatedVoterWeight?.value]
  )
  const showJoinButton =
    userNeedsTokenOwnerRecord || userNeedsVoterWeightRecords

  const join = async () => {
    const instructions = await handleRegister()
    const transaction = new Transaction()
    transaction.add(...instructions)

    await sendTransaction({
      transaction: transaction,
      wallet: wallet!,
      connection,
      signers: [],
      sendingMessage: `Registering`,
      successMessage: `Registered`,
    })
  }

  if (isLoading || !isReady) {
    return (
      <div
        className={classNames(
          className,
          'rounded-md bg-bkg-1 h-[76px] animate-pulse'
        )}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center mb-2">
        <p className="mb-1">Quadratic Voting</p>
        <QuadraticVotingInfoModal
          voteWeight={formattedTotal ?? '0'}
          tokenAmount={formattedTokenAmount ?? '0'}
          totalVoteWeight={formattedMax ?? '0'}
          totalMembers={activeMembers?.length ?? 0}
        />
      </div>
      <div className={'p-3 rounded-md bg-bkg-1'}>
        <div className="flex items-center justify-between mt-1">
          <div className={clsx(className)}>
            <div className="flex">
              <div className="flex flex-col">
                <p className="font-bold">
                  {formattedTokenAmount ?? '0'} tokens | {formattedTotal ?? '0'}{' '}
                  votes
                </p>
                <p className="text-fgd-3 mb-2">
                  {(
                    (Number(formattedTotal ?? '0') /
                      Number(formattedMax ?? '0')) *
                    100
                  ).toFixed(2) ?? 0}
                  % of possible votes
                </p>
              </div>
            </div>
            <div className="text-xl font-bold text-fgd-1 hero-text">
              {connected && showJoinButton && (
                <Button className="w-full" onClick={join}>
                  Join
                </Button>
              )}
              <TokenDeposit
                mint={mintInfo}
                tokenRole={GoverningTokenRole.Community}
                inAccountDetails={true}
                hideVotes={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
