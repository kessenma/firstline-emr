import React, { useCallback } from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { ActivityIndicator, View } from 'react-native';

interface InfiniteScrollProps<T>
  extends Omit<
    FlashListProps<T>,
    'onEndReached' | 'ListFooterComponent' | 'onEndReachedThreshold'
  > {
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
  onEndReachedThreshold?: number;
  endMessage?: React.ReactNode;
}

const InfiniteScroll = <T,>({
  hasMore,
  onLoadMore,
  isLoading = false,
  onEndReachedThreshold = 0.1,
  endMessage,
  ...flashListProps
}: InfiniteScrollProps<T>) => {
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const ListFooterComponent = isLoading ? (
    <View style={{ padding: 16, alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  ) : !hasMore && endMessage ? (
    <View style={{ padding: 16, alignItems: 'center' }}>{endMessage}</View>
  ) : null;

  return (
    <FlashList
      {...flashListProps}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={ListFooterComponent}
    />
  );
};

export { InfiniteScroll };
