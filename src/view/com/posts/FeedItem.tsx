import React, {useMemo, useState} from 'react'
import {observer} from 'mobx-react-lite'
import {StyleSheet, View} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import Svg, {Circle, Line} from 'react-native-svg'
import {AtUri} from '../../../third-party/uri'
import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {FeedItemModel} from 'state/models/feed-view'
import {Link} from '../util/Link'
import {Text} from '../util/text/Text'
import {UserInfoText} from '../util/UserInfoText'
import {PostMeta} from '../util/PostMeta'
import {PostCtrls} from '../util/PostCtrls'
import {PostEmbeds} from '../util/PostEmbeds'
import {RichText} from '../util/text/RichText'
import * as Toast from '../util/Toast'
import {UserAvatar} from '../util/UserAvatar'
import {s} from 'lib/styles'
import {useStores} from 'state/index'
import {usePalette} from 'lib/hooks/usePalette'
import {useAnalytics} from 'lib/analytics'
import {isDesktopWeb} from 'platform/detection'

export const FeedItem = observer(function ({
  item,
  showReplyLine,
  ignoreMuteFor,
}: {
  item: FeedItemModel
  showReplyLine?: boolean
  ignoreMuteFor?: string
}) {
  const store = useStores()
  const pal = usePalette('default')
  const {track} = useAnalytics()
  const [deleted, setDeleted] = useState(false)
  const record = item.postRecord
  const itemUri = item.post.uri
  const itemCid = item.post.cid
  const itemHref = useMemo(() => {
    const urip = new AtUri(item.post.uri)
    return `/profile/${item.post.author.handle}/post/${urip.rkey}`
  }, [item.post.uri, item.post.author.handle])
  const itemTitle = `Post by ${item.post.author.handle}`
  const authorHref = `/profile/${item.post.author.handle}`
  const replyAuthorDid = useMemo(() => {
    if (!record?.reply) {
      return ''
    }
    const urip = new AtUri(record.reply.parent?.uri || record.reply.root.uri)
    return urip.hostname
  }, [record?.reply])

  const onPressReply = () => {
    track('FeedItem:PostReply')
    store.shell.openComposer({
      replyTo: {
        uri: item.post.uri,
        cid: item.post.cid,
        text: record?.text || '',
        author: {
          handle: item.post.author.handle,
          displayName: item.post.author.displayName,
          avatar: item.post.author.avatar,
        },
      },
    })
  }
  const onPressToggleRepost = () => {
    track('FeedItem:PostRepost')
    return item
      .toggleRepost()
      .catch(e => store.log.error('Failed to toggle repost', e))
  }
  const onPressToggleUpvote = () => {
    track('FeedItem:PostLike')
    return item
      .toggleUpvote()
      .catch(e => store.log.error('Failed to toggle upvote', e))
  }
  const onCopyPostText = () => {
    Clipboard.setString(record?.text || '')
    Toast.show('Copied to clipboard')
  }
  const onDeletePost = () => {
    track('FeedItem:PostDelete')
    item.delete().then(
      () => {
        setDeleted(true)
        Toast.show('Post deleted')
      },
      e => {
        store.log.error('Failed to delete post', e)
        Toast.show('Failed to delete post, please try again')
      },
    )
  }

  if (!record || deleted) {
    return <View />
  }

  const isChild =
    item._isThreadChild || (!item.reason && !item._hideParent && item.reply)
  const isSmallTop = isChild && item._isThreadChild
  const isNoTop = isChild && !item._isThreadChild
  const outerStyles = [
    styles.outer,
    isDesktopWeb && styles.outerDesktopWeb,
    pal.view,
    {borderColor: pal.colors.border},
    isSmallTop ? styles.outerSmallTop : undefined,
    isNoTop ? styles.outerNoTop : undefined,
    item._isThreadParent ? styles.outerNoBottom : undefined,
  ]

  return (
    <>
      {isChild && !item._isThreadChild && item.replyParent ? (
        <FeedItem
          item={item.replyParent}
          showReplyLine
          ignoreMuteFor={ignoreMuteFor}
        />
      ) : undefined}
      <Link style={outerStyles} href={itemHref} title={itemTitle} noFeedback>
        {item._isThreadChild && (
          <View
            style={[styles.topReplyLine, {borderColor: pal.colors.replyLine}]}
          />
        )}
        {(showReplyLine || item._isThreadParent) && (
          <View
            style={[
              styles.bottomReplyLine,
              {borderColor: pal.colors.replyLine},
              isNoTop ? styles.bottomReplyLineNoTop : undefined,
            ]}
          />
        )}
        {item.reasonRepost && (
          <Link
            style={styles.includeReason}
            href={`/profile/${item.reasonRepost.by.handle}`}
            title={
              item.reasonRepost.by.displayName || item.reasonRepost.by.handle
            }>
            <FontAwesomeIcon
              icon="retweet"
              style={[
                styles.includeReasonIcon,
                {color: pal.colors.textLight} as FontAwesomeIconStyle,
              ]}
            />
            <Text type="sm-bold" style={pal.textLight}>
              Reposted by{' '}
              {item.reasonRepost.by.displayName || item.reasonRepost.by.handle}
            </Text>
          </Link>
        )}
        <View style={styles.layout}>
          <View style={styles.layoutAvi}>
            <Link href={authorHref} title={item.post.author.handle}>
              <UserAvatar
                size={52}
                displayName={item.post.author.displayName}
                handle={item.post.author.handle}
                avatar={item.post.author.avatar}
              />
            </Link>
          </View>
          <View style={styles.layoutContent}>
            <PostMeta
              authorHandle={item.post.author.handle}
              authorDisplayName={item.post.author.displayName}
              timestamp={item.post.indexedAt}
            />
            {!isChild && replyAuthorDid !== '' && (
              <View style={[s.flexRow, s.mb2, s.alignCenter]}>
                <FontAwesomeIcon
                  icon="reply"
                  size={9}
                  style={[
                    {color: pal.colors.textLight} as FontAwesomeIconStyle,
                    s.mr5,
                  ]}
                />
                <Text type="md" style={[pal.textLight, s.mr2]}>
                  Reply to
                </Text>
                <UserInfoText
                  type="md"
                  did={replyAuthorDid}
                  attr="displayName"
                  style={[pal.textLight, s.ml2]}
                />
              </View>
            )}
            {item.post.author.viewer?.muted &&
            ignoreMuteFor !== item.post.author.did ? (
              <View style={[styles.mutedWarning, pal.btn]}>
                <FontAwesomeIcon icon={['far', 'eye-slash']} style={s.mr2} />
                <Text type="sm">This post is by a muted account.</Text>
              </View>
            ) : item.richText?.text ? (
              <View style={styles.postTextContainer}>
                <RichText
                  type="post-text"
                  richText={item.richText}
                  lineHeight={1.3}
                />
              </View>
            ) : undefined}
            {item.post.embed ? (
              <PostEmbeds embed={item.post.embed} style={styles.embed} />
            ) : null}
            <PostCtrls
              style={styles.ctrls}
              itemUri={itemUri}
              itemCid={itemCid}
              itemHref={itemHref}
              itemTitle={itemTitle}
              isAuthor={item.post.author.did === store.me.did}
              replyCount={item.post.replyCount}
              repostCount={item.post.repostCount}
              upvoteCount={item.post.upvoteCount}
              isReposted={!!item.post.viewer.repost}
              isUpvoted={!!item.post.viewer.upvote}
              onPressReply={onPressReply}
              onPressToggleRepost={onPressToggleRepost}
              onPressToggleUpvote={onPressToggleUpvote}
              onCopyPostText={onCopyPostText}
              onDeletePost={onDeletePost}
            />
          </View>
        </View>
      </Link>
      {item._isThreadChildElided ? (
        <Link
          style={[pal.view, styles.viewFullThread]}
          href={itemHref}
          title={itemTitle}
          noFeedback>
          <View style={styles.viewFullThreadDots}>
            <Svg width="4" height="30">
              <Line
                x1="2"
                y1="0"
                x2="2"
                y2="8"
                stroke={pal.colors.replyLine}
                strokeWidth="2"
              />
              <Circle x="2" y="14" r="1.5" fill={pal.colors.replyLineDot} />
              <Circle x="2" y="20" r="1.5" fill={pal.colors.replyLineDot} />
              <Circle x="2" y="26" r="1.5" fill={pal.colors.replyLineDot} />
            </Svg>
          </View>
          <Text type="md" style={pal.link}>
            View full thread
          </Text>
        </Link>
      ) : undefined}
    </>
  )
})

const styles = StyleSheet.create({
  outer: {
    borderTopWidth: 1,
    padding: 10,
    paddingRight: 15,
    paddingBottom: 8,
  },
  outerDesktopWeb: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 10,
  },
  outerNoTop: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  outerSmallTop: {
    borderTopWidth: 0,
  },
  outerNoBottom: {
    paddingBottom: 2,
    marginBottom: 0,
  },
  topReplyLine: {
    position: 'absolute',
    left: 42,
    top: 0,
    height: 6,
    borderLeftWidth: 2,
  },
  bottomReplyLine: {
    position: 'absolute',
    left: 42,
    top: 72,
    bottom: 0,
    borderLeftWidth: 2,
  },
  bottomReplyLineNoTop: {top: 64},
  includeReason: {
    flexDirection: 'row',
    paddingLeft: 50,
    marginTop: 2,
    marginBottom: 2,
  },
  includeReasonIcon: {
    marginRight: 4,
  },
  layout: {
    flexDirection: 'row',
    marginTop: 1,
  },
  layoutAvi: {
    width: 70,
    paddingLeft: 8,
  },
  layoutContent: {
    flex: 1,
  },
  mutedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginTop: 2,
    marginBottom: 6,
    borderRadius: 2,
  },
  postTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingBottom: 4,
  },
  embed: {
    marginBottom: 6,
  },
  ctrls: {
    marginTop: 4,
  },
  viewFullThread: {
    paddingTop: 12,
    paddingBottom: 2,
    paddingLeft: 80,
  },
  viewFullThreadDots: {
    position: 'absolute',
    left: 41,
    top: 0,
  },
})
