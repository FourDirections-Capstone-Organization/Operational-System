using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<JobPosition> JobPositions => Set<JobPosition>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.MiddleName).HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Suffix).HasMaxLength(20);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.EmployeeID).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ContactNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Gender).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.EmployeeID).IsUnique();
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.HasOne(e => e.Employee)
                  .WithOne(e => e.Account)
                  .HasForeignKey<Account>(e => e.EmployeeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasOne(e => e.Account)
                  .WithMany(a => a.RefreshTokens)
                  .HasForeignKey(e => e.AccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

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
