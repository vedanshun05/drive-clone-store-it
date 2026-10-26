import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { convertFileSize, getUsageSummary } from "@/lib/utils";
import { Chart } from "@/components/Chart";
import FormattedDateTime from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import ActionDropdown from "@/components/ActionDropdown";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

const Dashboard = async () => {
  // Pages and layouts render in parallel; protect data loading here as well.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  // Parallel requests
  const [files, sharedFiles, totalSpace] = await Promise.all([
    getFiles({ types: [], limit: 10, scope: "owned" }),
    getFiles({ types: [], limit: 5, scope: "shared" }),
    getTotalSpaceUsed(),
  ]);

  // Get usage summary
  const usageSummary = getUsageSummary(totalSpace);

  return (
    <div className="dashboard-container">
      <section>
        <Chart used={totalSpace.used} />

        {/* Uploaded file type summaries */}
        <ul className="dashboard-summary-list">
          {usageSummary.map((summary) => (
            <Link
              href={summary.url}
              key={summary.title}
              className="dashboard-summary-card"
            >
              <div className="space-y-4">
                <div className="flex justify-between gap-3">
                  <Image
                    src={summary.icon}
                    width={100}
                    height={100}
                    alt="uploaded image"
                    className="summary-type-icon"
                  />
                  <h4 className="summary-type-size">
                    {convertFileSize(summary.size) || 0}
                  </h4>
                </div>

                <h5 className="summary-type-title">{summary.title}</h5>
                <Separator className="bg-light-400" />
                <FormattedDateTime
                  date={summary.latestDate}
                  className="text-center"
                />
              </div>
            </Link>
          ))}
        </ul>
      </section>

      <section className="dashboard-recent-files space-y-8">
        {[
          { title: "Recent files uploaded", files: files.rows, shared: false },
          { title: "Shared with me", files: sharedFiles.rows, shared: true },
        ].map((group) => (
          <section key={group.title} aria-label={group.title}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="h3 text-light-100 xl:h2">{group.title}</h2>
              {group.shared && (
                <Link
                  href="/shared"
                  className="shrink-0 text-sm font-semibold text-brand"
                >
                  View all
                </Link>
              )}
            </div>
            {group.files.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-5">
                {group.files.map((file: AppwriteFile) => (
                  <li className="flex items-center gap-3" key={file.$id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Thumbnail
                        type={file.type}
                        extension={file.extension}
                        url={file.url}
                      />
                      <div className="recent-file-details">
                        <div className="flex flex-col gap-1">
                          <p className="recent-file-name">{file.name}</p>
                          {group.shared ? (
                            <p className="caption text-light-200">
                              Shared by {file.owner.fullName}
                            </p>
                          ) : (
                            <FormattedDateTime
                              date={file.$createdAt}
                              className="caption"
                            />
                          )}
                        </div>
                      </div>
                    </a>
                    <ActionDropdown file={file} canManage={!group.shared} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-center text-sm text-light-200">
                {group.shared
                  ? "No files shared with you"
                  : "No files uploaded"}
              </p>
            )}
          </section>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
