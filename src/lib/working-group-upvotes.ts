type CanonicalUpvote = {
  upvotes?: number;
  hasUpvoted?: boolean;
};

/** Applies an optimistic viewer state without counting a canonical upvote twice. */
export function displayedWorkingGroupUpvote(
  post: CanonicalUpvote,
  optimisticState: boolean | undefined
) {
  const canonicalState = post.hasUpvoted ?? false;
  const selected = optimisticState ?? canonicalState;
  const count = Math.max(
    0,
    (post.upvotes ?? 0) + Number(selected) - Number(canonicalState)
  );

  return { selected, count };
}
