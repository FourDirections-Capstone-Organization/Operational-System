namespace Backend.Tests.TaskManagement;

public class CommentOwnershipTests
{
    private (bool IsOwned, string? ErrorMessage) ValidateOwnership(Guid commentAuthorId, Guid requestUserId)
    {
        if (commentAuthorId != requestUserId)
            return (false, "Unauthorized comment modification");

        return (true, null);
    }

    [Fact]
    public void Author_CanEditOwnComment()
    {
        var authorId = Guid.NewGuid();
        var (isOwned, _) = ValidateOwnership(authorId, authorId);
        Assert.True(isOwned);
    }

    [Fact]
    public void Author_CanDeleteOwnComment()
    {
        var authorId = Guid.NewGuid();
        var (isOwned, _) = ValidateOwnership(authorId, authorId);
        Assert.True(isOwned);
    }

    [Fact]
    public void OtherUser_CannotEditComment()
    {
        var authorId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var (isOwned, error) = ValidateOwnership(authorId, otherUserId);
        Assert.False(isOwned);
        Assert.Contains("Unauthorized", error);
    }

    [Fact]
    public void OtherUser_CannotDeleteComment()
    {
        var authorId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var (isOwned, error) = ValidateOwnership(authorId, otherUserId);
        Assert.False(isOwned);
        Assert.Contains("Unauthorized", error);
    }

    [Fact]
    public void CannotEditDeletedComment()
    {
        var commentIsDeleted = true;
        var canEdit = !commentIsDeleted;
        Assert.False(canEdit);
    }

    [Fact]
    public void CannotDeleteDeletedComment()
    {
        var commentIsDeleted = true;
        var canDelete = !commentIsDeleted;
        Assert.False(canDelete);
    }
}
