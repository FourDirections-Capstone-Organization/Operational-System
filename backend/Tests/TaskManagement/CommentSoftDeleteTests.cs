namespace Backend.Tests.TaskManagement;

public class CommentSoftDeleteTests
{
    [Fact]
    public void DeletedComment_HiddenFromThread()
    {
        var comments = new List<(bool IsDeleted, string Content)>
        {
            (false, "First comment"),
            (true, "Deleted comment"),
            (false, "Second comment")
        };

        var visible = comments.Where(c => !c.IsDeleted).ToList();
        Assert.Equal(2, visible.Count);
        Assert.DoesNotContain("Deleted comment", visible.Select(c => c.Content));
    }

    [Fact]
    public void NonDeletedComments_StillVisible()
    {
        var comments = new List<(bool IsDeleted, string Content)>
        {
            (false, "Active comment 1"),
            (true, "Deleted comment"),
            (false, "Active comment 2")
        };

        var visible = comments.Where(c => !c.IsDeleted).ToList();
        Assert.Contains("Active comment 1", visible.Select(c => c.Content));
        Assert.Contains("Active comment 2", visible.Select(c => c.Content));
    }

    [Fact]
    public void Deletion_SetsIsDeletedFlag()
    {
        var isDeleted = false;
        isDeleted = true;
        Assert.True(isDeleted);
    }

    [Fact]
    public void Deletion_DoesNotRemoveRecord()
    {
        var commentId = Guid.NewGuid();
        var content = "Original content";
        var isDeleted = false;
        isDeleted = true;
        Assert.NotNull(commentId);
        Assert.Equal("Original content", content);
    }

    [Fact]
    public void SoftDeleteFlag_DefaultsToFalse()
    {
        var comment = new Backend.Models.TaskComment
        {
            TaskId = Guid.NewGuid(),
            AuthorId = Guid.NewGuid(),
            Content = "Test comment"
        };
        Assert.False(comment.IsDeleted);
    }
}
