import { IUser } from "../modules/users/user.model";
import { IOrganization } from "../modules/organizations/organization.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      org?: IOrganization;
    }
  }
}
