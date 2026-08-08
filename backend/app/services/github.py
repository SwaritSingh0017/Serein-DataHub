"""GitHub provider protocol and implementations.

The GitHub layer only ships code - it never generates code.
It creates a branch, commits fix files, and opens a Pull Request.

See docs/10_GITHUB_SPEC.md.
"""

from __future__ import annotations

from typing import Protocol
from github import Github, GithubException

from app.models.agents import FixFile, PullRequestResult
from app.core.config import settings


class GitHubProvider(Protocol):
    """Provider-agnostic interface for GitHub operations."""

    async def create_branch(self, repo: str, base: str, branch: str) -> str: ...
    async def create_or_update_file(
        self, repo: str, branch: str, path: str, content: str, message: str, is_new: bool
    ) -> str: ...
    async def create_pull_request(
        self, repo: str, branch: str, base: str, title: str, body: str
    ) -> PullRequestResult: ...


class GitHubError(Exception):
    """GitHub API error."""


class PyGithubProvider:
    """Real GitHub provider using PyGithub."""

    def __init__(self) -> None:
        if not settings.GITHUB_TOKEN:
            raise GitHubError("GITHUB_TOKEN not configured")
        if not settings.GITHUB_REPOSITORY:
            raise GitHubError("GITHUB_REPOSITORY not configured")
        self._gh = Github(settings.GITHUB_TOKEN)
        self._repo_name = settings.GITHUB_REPOSITORY
        self._repo = self._gh.get_repo(self._repo_name)
        self._base_branch = settings.GITHUB_BASE_BRANCH

    async def create_branch(self, repo: str, base: str, branch: str) -> str:
        base_branch = self._repo.get_branch(base)
        self._repo.create_git_ref(ref=f"refs/heads/{branch}", sha=base_branch.commit.sha)
        return branch

    async def create_or_update_file(
        self, repo: str, branch: str, path: str, content: str, message: str, is_new: bool
    ) -> str:
        try:
            if is_new:
                self._repo.create_file(path, message, content, branch=branch)
            else:
                file = self._repo.get_contents(path, ref=branch)
                self._repo.update_file(path, message, content, file.sha, branch=branch)
        except GithubException as exc:
            if exc.status == 404 and is_new:
                self._repo.create_file(path, message, content, branch=branch)
            else:
                raise
        return path

    async def create_pull_request(
        self, repo: str, branch: str, base: str, title: str, body: str
    ) -> PullRequestResult:
        pr = self._repo.create_pull(
            title=title,
            body=body,
            head=branch,
            base=base or self._base_branch,
            draft=settings.GITHUB_DRAFT_PR,
        )
        return PullRequestResult(
            repository=self._repo_name,
            branch=branch,
            pr_number=pr.number,
            pr_url=pr.html_url,
            commit_sha=pr.head.sha,
            files_changed=[f.filename for f in pr.get_files()],
        )

    def close(self) -> None:
        self._gh.close()


class StubGitHubProvider:
    """Deterministic stub for tests / offline demo."""

    def __init__(self) -> None:
        self._branches: set[str] = set()
        self._files: dict[str, dict[str, str]] = {}  # branch -> path -> content

    async def create_branch(self, repo: str, base: str, branch: str) -> str:
        self._branches.add(branch)
        self._files[branch] = {}
        return branch

    async def create_or_update_file(
        self, repo: str, branch: str, path: str, content: str, message: str, is_new: bool
    ) -> str:
        if branch not in self._files:
            self._files[branch] = {}
        self._files[branch][path] = content
        return path

    async def create_pull_request(
        self, repo: str, branch: str, base: str, title: str, body: str
    ) -> PullRequestResult:
        return PullRequestResult(
            repository=repo,
            branch=branch,
            pr_number=999,
            pr_url=f"https://github.com/{repo}/pull/999",
            commit_sha="stub-sha",
            files_changed=list(self._files.get(branch, {}).keys()),
        )


def get_github_provider() -> GitHubProvider:
    """Select GitHub provider - stub if token missing, real otherwise."""
    if not settings.GITHUB_TOKEN or not settings.GITHUB_REPOSITORY:
        import logging
        logger = logging.getLogger("serein_datahub.github")
        logger.warning("GitHub credentials not configured; using stub provider")
        return StubGitHubProvider()
    return PyGithubProvider()