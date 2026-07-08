using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<JobPosition> JobPositions => Set<JobPosition>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Department Configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);

            // One-to-many - Department -> JobPositions
            entity.HasMany(d => d.JobPositions)
                .WithOne(jp => jp.Department)
                .HasForeignKey(jp => jp.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // One-to-many - Department -> Users
            entity.HasMany(d => d.Users)
                .WithOne(u => u.Department)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // JobPosition Configuration
        modelBuilder.Entity<JobPosition>(entity =>
        {
           entity.HasKey(e => e.Id);
           entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

           // One-to-many - JobPosition -> User
           entity.HasMany(jp => jp.Users)
                .WithOne(u => u.JobPosition)
                .HasForeignKey(u => u.JobPositionId)
                .OnDelete(DeleteBehavior.Restrict); 
        });

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
           entity.HasKey(e => e.Id);
           entity.Property(e => e.EmployeeNumber).IsRequired().HasMaxLength(20);
           entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
           entity.Property(e => e.FirstName).IsRequired().HasMaxLength(50);
           entity.Property(e => e.LastName).IsRequired().HasMaxLength(50);

           // Unique Constraints
           entity.HasIndex(e => e.EmployeeNumber).IsUnique();
           entity.HasIndex(e => e.Email).IsUnique();
           entity.HasIndex(e => e.Username).IsUnique().HasFilter("\"Username\" IS NOT NULL");
        });
    }
}
